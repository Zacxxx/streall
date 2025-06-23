const puppeteer = require('puppeteer');
const fs = require('fs');

async function testDynamicStreamExtraction() {
  console.log('🎬 Testing dynamic stream extraction with JavaScript execution...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Intercept all network requests to capture video URLs
    const videoRequests = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      
      // Capture any video-related requests
      if (url.includes('.m3u8') || 
          url.includes('.mp4') || 
          url.includes('.webm') ||
          url.includes('.ts') ||  // HLS segments
          url.includes('stream') ||
          url.includes('video') ||
          url.includes('playlist') ||
          url.includes('segment') ||
          request.resourceType() === 'media') {
        
        videoRequests.push({
          url,
          method: request.method(),
          headers: request.headers(),
          resourceType: request.resourceType(),
          timestamp: new Date().toISOString()
        });
        
        console.log(`🎥 Video request captured: ${request.method()} ${url}`);
      }
      
      request.continue();
    });

    // Also monitor responses for video content
    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      if (contentType.includes('video/') || 
          contentType.includes('application/vnd.apple.mpegurl') || // HLS
          contentType.includes('application/x-mpegURL') ||
          url.includes('.m3u8') ||
          url.includes('.mp4')) {
        
        console.log(`📹 Video response: ${response.status()} ${contentType} ${url}`);
      }
    });

    // Navigate directly to the streamingnow URL
    console.log('🔗 Getting streamingnow URL...');
    const embedUrl = 'https://multiembed.mov/?video_id=574475&tmdb=1';
    const redirectResponse = await page.goto(embedUrl, { waitUntil: 'networkidle0' });
    const finalUrl = page.url();
    
    console.log(`📍 Final URL after redirect: ${finalUrl}`);

    // Inject JavaScript to monitor JWPlayer and video element creation
    await page.evaluate(() => {
      // Override JWPlayer setup to capture configuration
      if (typeof jwplayer !== 'undefined') {
        const originalSetup = jwplayer.prototype.setup;
        jwplayer.prototype.setup = function(config) {
          console.log('🎬 JWPlayer setup intercepted!', config);
          window.jwPlayerConfig = config;
          return originalSetup.call(this, config);
        };
      }

      // Monitor for video element creation
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'VIDEO') {
              console.log('📺 Video element created:', node);
              console.log('📺 Video src:', node.src);
              console.log('📺 Video sources:', Array.from(node.querySelectorAll('source')).map(s => ({src: s.src, type: s.type})));
              window.videoElement = node;
            }
          });
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });

      // Also check for existing video elements
      const existingVideos = document.querySelectorAll('video');
      if (existingVideos.length > 0) {
        console.log('📺 Found existing video elements:', existingVideos.length);
        existingVideos.forEach((video, i) => {
          console.log(`📺 Video ${i + 1} src:`, video.src);
        });
      }
    });

    // Wait for page to fully load and JavaScript to execute
    console.log('⏳ Waiting for video streams to load...');
    await page.waitForFunction(() => true, { timeout: 10000 }).catch(() => {});

    // Try to find video elements and their sources
    const videoInfo = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      const videoData = videos.map(video => ({
        src: video.src,
        currentSrc: video.currentSrc,
        sources: Array.from(video.querySelectorAll('source')).map(s => ({
          src: s.src,
          type: s.type
        })),
        readyState: video.readyState,
        networkState: video.networkState
      }));

      // Also check for JWPlayer config
      const jwConfig = window.jwPlayerConfig;

      // Look for any global variables that might contain stream URLs
      const possibleStreamVars = [];
      for (let key in window) {
        try {
          const value = window[key];
          if (typeof value === 'string' && 
              (value.includes('.m3u8') || value.includes('.mp4') || value.includes('stream'))) {
            possibleStreamVars.push({ key, value });
          } else if (typeof value === 'object' && value !== null) {
            // Check if object contains stream URLs
            const jsonStr = JSON.stringify(value);
            if (jsonStr.includes('.m3u8') || jsonStr.includes('.mp4')) {
              possibleStreamVars.push({ key, value });
            }
          }
        } catch (e) {
          // Skip inaccessible properties
        }
      }

      return {
        videoElements: videoData,
        jwPlayerConfig: jwConfig,
        streamVariables: possibleStreamVars,
        windowKeys: Object.keys(window).filter(k => k.includes('player') || k.includes('stream') || k.includes('video')).slice(0, 20)
      };
    });

    console.log('🔍 Video analysis results:');
    console.log(`📺 Video elements found: ${videoInfo.videoElements.length}`);
    videoInfo.videoElements.forEach((video, i) => {
      console.log(`  Video ${i + 1}:`);
      console.log(`    src: ${video.src || 'none'}`);
      console.log(`    currentSrc: ${video.currentSrc || 'none'}`);
      console.log(`    sources: ${video.sources.length}`);
      video.sources.forEach((source, j) => {
        console.log(`      ${j + 1}: ${source.src} (${source.type})`);
      });
    });

    if (videoInfo.jwPlayerConfig) {
      console.log('🎬 JWPlayer config captured:', JSON.stringify(videoInfo.jwPlayerConfig, null, 2));
    }

    if (videoInfo.streamVariables.length > 0) {
      console.log(`🔗 Stream variables found: ${videoInfo.streamVariables.length}`);
      videoInfo.streamVariables.forEach((variable, i) => {
        console.log(`  ${i + 1}: ${variable.key} = ${typeof variable.value === 'string' ? variable.value.substring(0, 100) + '...' : JSON.stringify(variable.value).substring(0, 100) + '...'}`);
      });
    }

    console.log(`🌐 Window keys related to video: ${videoInfo.windowKeys.join(', ')}`);

    // Save captured data
    const capturedData = {
      finalUrl,
      videoRequests,
      videoInfo,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync('dynamic-stream-capture.json', JSON.stringify(capturedData, null, 2));
    console.log('💾 Captured data saved to dynamic-stream-capture.json');

    // Take screenshot for debugging
    await page.screenshot({ path: 'dynamic-stream-test.png', fullPage: true });
    console.log('📸 Screenshot saved to dynamic-stream-test.png');

    console.log('\n📊 Summary:');
    console.log(`- Video requests captured: ${videoRequests.length}`);
    console.log(`- Video elements found: ${videoInfo.videoElements.length}`);
    console.log(`- JWPlayer config captured: ${videoInfo.jwPlayerConfig ? 'Yes' : 'No'}`);
    console.log(`- Stream variables found: ${videoInfo.streamVariables.length}`);

    if (videoRequests.length > 0) {
      console.log('\n🎯 Potential stream URLs:');
      videoRequests.forEach((req, i) => {
        console.log(`  ${i + 1}: ${req.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      console.log('🔚 Closing browser...');
      await browser.close();
    }
  }
}

testDynamicStreamExtraction().catch(console.error); 