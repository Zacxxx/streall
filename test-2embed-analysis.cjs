const puppeteer = require('puppeteer');

async function analyze2embed() {
  console.log('🔍 Direct 2embed.cc Analysis');
  console.log('============================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor ALL network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });
    
    // Monitor console messages
    page.on('console', msg => {
      console.log(`🖥️ [${msg.type()}] ${msg.text()}`);
    });
    
    // Navigate directly to 2embed.cc
    const embedUrl = 'https://www.2embed.cc/embed/574475';
    console.log(`\n🎬 Loading 2embed.cc directly: ${embedUrl}`);
    
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded');
    
    // Wait for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Analyze page structure
    const pageAnalysis = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        iframes: Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          width: iframe.width,
          height: iframe.height,
          display: getComputedStyle(iframe).display
        })),
        videos: Array.from(document.querySelectorAll('video')).map(video => ({
          src: video.src,
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState
        })),
        scripts: Array.from(document.querySelectorAll('script')).map(script => ({
          src: script.src,
          hasContent: script.textContent ? script.textContent.length > 0 : false,
          contentPreview: script.textContent ? script.textContent.substring(0, 200) : null
        })),
        bodyContent: document.body.innerHTML.length,
        hasJWPlayer: typeof window.jwplayer !== 'undefined',
        hasVideoJS: typeof window.videojs !== 'undefined',
        windowKeys: Object.keys(window).filter(key => 
          key.toLowerCase().includes('player') || 
          key.toLowerCase().includes('stream') || 
          key.toLowerCase().includes('video')
        )
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('==================');
    console.log(`Title: ${pageAnalysis.title}`);
    console.log(`Final URL: ${pageAnalysis.url}`);
    console.log(`Iframes: ${pageAnalysis.iframes.length}`);
    console.log(`Videos: ${pageAnalysis.videos.length}`);
    console.log(`Scripts: ${pageAnalysis.scripts.length}`);
    console.log(`Body content length: ${pageAnalysis.bodyContent}`);
    console.log(`Has JWPlayer: ${pageAnalysis.hasJWPlayer}`);
    console.log(`Has Video.js: ${pageAnalysis.hasVideoJS}`);
    
    if (pageAnalysis.iframes.length > 0) {
      console.log('\n📺 Iframes found:');
      pageAnalysis.iframes.forEach((iframe, i) => {
        console.log(`   ${i + 1}: ${iframe.src}`);
      });
    }
    
    if (pageAnalysis.videos.length > 0) {
      console.log('\n🎬 Videos found:');
      pageAnalysis.videos.forEach((video, i) => {
        console.log(`   ${i + 1}: ${video.src || video.currentSrc || 'No source'}`);
      });
    }
    
    if (pageAnalysis.windowKeys.length > 0) {
      console.log('\n🔑 Relevant window keys:');
      pageAnalysis.windowKeys.forEach(key => {
        console.log(`   ${key}`);
      });
    }
    
    // Analyze network requests
    console.log('\n🌐 Network Requests Analysis:');
    console.log('=============================');
    
    const streamRequests = requests.filter(req => 
      req.url.includes('.m3u8') || req.url.includes('.mp4') || req.url.includes('.webm') ||
      req.url.includes('stream') || req.url.includes('video') || req.url.includes('media') ||
      req.url.includes('player') || req.url.includes('embed')
    );
    
    console.log(`Total requests: ${requests.length}`);
    console.log(`Potential stream requests: ${streamRequests.length}`);
    
    if (streamRequests.length > 0) {
      console.log('\n🎯 Potential stream requests:');
      streamRequests.forEach((req, i) => {
        console.log(`   ${i + 1}: [${req.method}] ${req.url}`);
      });
    }
    
    // Look for redirects or additional embed URLs
    const embedRequests = requests.filter(req => 
      req.url.includes('embed') || req.url.includes('player') || 
      req.url.includes('2embed') || req.url.includes('streamingnow')
    );
    
    if (embedRequests.length > 0) {
      console.log('\n🔗 Embed/Player requests:');
      embedRequests.forEach((req, i) => {
        console.log(`   ${i + 1}: [${req.method}] ${req.url}`);
      });
    }
    
    // Try to find any JavaScript that might contain stream URLs
    const jsAnalysis = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const streamUrls = [];
      
      scripts.forEach(script => {
        if (script.textContent) {
          // Look for URLs that might be streams
          const urlPattern = /https?:\/\/[^\s"'<>]+\.(m3u8|mp4|webm|mpd)/gi;
          let match;
          while ((match = urlPattern.exec(script.textContent)) !== null) {
            streamUrls.push(match[0]);
          }
          
          // Look for common streaming service patterns
          const streamingPatterns = [
            /https?:\/\/[^\s"'<>]*streamingnow[^\s"'<>]*/gi,
            /https?:\/\/[^\s"'<>]*vidplay[^\s"'<>]*/gi,
            /https?:\/\/[^\s"'<>]*filemoon[^\s"'<>]*/gi
          ];
          
          streamingPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(script.textContent)) !== null) {
              streamUrls.push(match[0]);
            }
          });
        }
      });
      
      return [...new Set(streamUrls)]; // Remove duplicates
    });
    
    if (jsAnalysis.length > 0) {
      console.log('\n🎯 URLs found in JavaScript:');
      jsAnalysis.forEach((url, i) => {
        console.log(`   ${i + 1}: ${url}`);
      });
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    console.log('Check the browser DevTools Network tab for more details');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

analyze2embed(); 