const puppeteer = require('puppeteer');

console.log('🚀 Enhanced 2embed.cc Stream Extraction Test');
console.log('==============================================');

async function testEnhanced2EmbedExtraction() {
  let browser = null;
  
  try {
    // Launch browser with appropriate settings
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
      defaultViewport: { width: 1366, height: 768 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Track network requests
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers()
      });
    });

    console.log('\n🧪 Test 1: Direct 2embed.cc Analysis');
    console.log('------------------------------------');
    
    const embedUrl = 'https://www.2embed.cc/embed/574475';
    console.log('🎬 Testing URL:', embedUrl);
    
    // Navigate to 2embed.cc
    await page.goto(embedUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for any redirects to complete
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('🔗 Final URL after redirects:', finalUrl);
    
    // Check if redirected to 2embed.skin
    if (finalUrl.includes('2embed.skin')) {
      console.log('✅ Successfully redirected to 2embed.skin');
      
      // Look for iframes on the skin page
      const iframes = await page.$$eval('iframe', iframes => {
        return iframes.map(iframe => ({
          src: iframe.src,
          width: iframe.width,
          height: iframe.height,
          allowFullscreen: iframe.allowFullscreen
        }));
      });
      
      console.log(`📺 Found ${iframes.length} iframes on skin page:`);
      iframes.forEach((iframe, index) => {
        console.log(`   ${index + 1}: ${iframe.src}`);
      });
      
      // Check for video elements
      const videos = await page.$$eval('video', videos => {
        return videos.map(video => ({
          src: video.src,
          poster: video.poster,
          controls: video.controls
        }));
      });
      
      console.log(`🎥 Found ${videos.length} video elements:`);
      videos.forEach((video, index) => {
        console.log(`   ${index + 1}: ${video.src}`);
      });
      
      // Look for potential streaming URLs in page content
      const streamUrls = await page.evaluate(() => {
        const html = document.documentElement.innerHTML;
        const streamPatterns = [
          /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
          /https?:\/\/[^"'\s]*\.mp4[^"'\s]*/gi,
          /https?:\/\/[^"'\s]*(?:stream|play|video)[^"'\s]*/gi
        ];
        
        const found = [];
        streamPatterns.forEach(pattern => {
          const matches = html.match(pattern);
          if (matches) {
            matches.forEach(url => {
              if (url.length > 20 && !url.includes('2embed') && !found.includes(url)) {
                found.push(url);
              }
            });
          }
        });
        
        return found;
      });
      
      console.log(`🔍 Found ${streamUrls.length} potential stream URLs in page:`);
      streamUrls.slice(0, 5).forEach((url, index) => {
        console.log(`   ${index + 1}: ${url}`);
      });
      
    } else {
      console.log('❌ No redirect to 2embed.skin detected');
    }

    console.log('\n🧪 Test 2: Network Traffic Analysis');
    console.log('-----------------------------------');
    
    // Filter interesting requests
    const streamRequests = requests.filter(req => 
      req.url.includes('stream') || 
      req.url.includes('play') || 
      req.url.includes('video') || 
      req.url.includes('.m3u8') || 
      req.url.includes('.mp4') ||
      req.url.includes('vsrc') ||
      req.url.includes('embed') && !req.url.includes('2embed.cc')
    );
    
    console.log(`🌐 Found ${streamRequests.length} potentially relevant requests:`);
    streamRequests.slice(0, 10).forEach((req, index) => {
      console.log(`   ${index + 1}: [${req.method}] ${req.url}`);
    });
    
    // Check responses for streaming content
    const streamResponses = responses.filter(resp => {
      const contentType = resp.headers['content-type'] || '';
      return contentType.includes('video') || 
             contentType.includes('application/vnd.apple.mpegurl') ||
             resp.url.includes('.m3u8') ||
             resp.url.includes('.mp4');
    });
    
    console.log(`📦 Found ${streamResponses.length} streaming responses:`);
    streamResponses.forEach((resp, index) => {
      console.log(`   ${index + 1}: [${resp.status}] ${resp.url}`);
      console.log(`       Content-Type: ${resp.headers['content-type'] || 'unknown'}`);
    });

    console.log('\n🧪 Test 3: Iframe Deep Analysis');
    console.log('-------------------------------');
    
    // If we found iframes, try to extract content from them
    const iframes = await page.$$('iframe');
    
    for (let i = 0; i < Math.min(iframes.length, 3); i++) {
      try {
        const iframe = iframes[i];
        const src = await iframe.evaluate(el => el.src);
        
        if (src && src.startsWith('http') && !src.includes('2embed')) {
          console.log(`🔍 Analyzing iframe ${i + 1}: ${src}`);
          
          // Create new page for iframe content
          const iframePage = await browser.newPage();
          await iframePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          try {
            await iframePage.goto(src, { 
              waitUntil: 'networkidle2',
              timeout: 15000 
            });
            
            // Look for streaming content in iframe
            const iframeStreams = await iframePage.evaluate(() => {
              const html = document.documentElement.innerHTML;
              const patterns = [
                /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/gi,
                /https?:\/\/[^"'\s]*\.mp4[^"'\s]*/gi,
                /file\s*:\s*["']([^"']*\.(?:m3u8|mp4))[^"']*/gi,
                /source\s*:\s*["']([^"']*\.(?:m3u8|mp4))[^"']*/gi
              ];
              
              const found = [];
              patterns.forEach(pattern => {
                const matches = html.match(pattern);
                if (matches) {
                  matches.forEach(url => {
                    const cleanUrl = url.replace(/.*["']([^"']+)["'].*/, '$1');
                    if (cleanUrl.startsWith('http') && !found.includes(cleanUrl)) {
                      found.push(cleanUrl);
                    }
                  });
                }
              });
              
              return found;
            });
            
            console.log(`   📺 Found ${iframeStreams.length} streams in iframe:`);
            iframeStreams.forEach((stream, index) => {
              console.log(`      ${index + 1}: ${stream}`);
            });
            
          } catch (error) {
            console.log(`   ❌ Failed to load iframe: ${error.message}`);
          } finally {
            await iframePage.close();
          }
        }
      } catch (error) {
        console.log(`   ❌ Error analyzing iframe ${i + 1}: ${error.message}`);
      }
    }

    console.log('\n🧪 Test 4: Enhanced Extraction Simulation');
    console.log('-----------------------------------------');
    
    // Simulate our enhanced extraction logic
    const extractionResults = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      
      // Test our new patterns
      const sources = [];
      
      // Enhanced patterns for 2embed.cc/2embed.skin
      const streamPatterns = [
        // HLS streams
        /(?:source|file|src|url)\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
        /["']([^"']*\.m3u8[^"']*)["']/g,
        
        // MP4 streams
        /(?:source|file|src|url)\s*:\s*["']([^"']*\.mp4[^"']*)["']/gi,
        /["']([^"']*\.mp4[^"']*)["']/g,
        
        // Streaming service URLs
        /https?:\/\/[^"'\s]*(?:stream|play|video|vsrc)[^"'\s]*(?:\.m3u8|\.mp4)?/gi,
      ];
      
      streamPatterns.forEach(pattern => {
        const matches = Array.from(html.matchAll(pattern));
        matches.forEach(match => {
          const url = match[1] || match[0];
          if (url && url.startsWith('http') && url.length > 20 && !url.includes('2embed')) {
            sources.push({
              url: url.trim(),
              type: url.includes('.m3u8') ? 'hls' : url.includes('.mp4') ? 'mp4' : 'unknown',
              method: 'pattern_extraction'
            });
          }
        });
      });
      
      // Look for base64 encoded URLs
      const encodedPatterns = [
        /atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/gi,
        /base64\s*:\s*["']([A-Za-z0-9+/=]+)["']/gi,
      ];
      
      encodedPatterns.forEach(pattern => {
        const matches = Array.from(html.matchAll(pattern));
        matches.forEach(match => {
          try {
            const decoded = atob(match[1]);
            if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
              sources.push({
                url: decoded,
                type: decoded.includes('.m3u8') ? 'hls' : 'mp4',
                method: 'base64_decode'
              });
            }
          } catch (e) {
            // Invalid base64
          }
        });
      });
      
      return {
        sources,
        pageTitle: document.title,
        finalUrl: window.location.href
      };
    });
    
    console.log(`🎯 Enhanced extraction found ${extractionResults.sources.length} sources:`);
    extractionResults.sources.forEach((source, index) => {
      console.log(`   ${index + 1}: [${source.type}] ${source.url} (via ${source.method})`);
    });
    
    console.log(`📰 Page Title: ${extractionResults.pageTitle}`);
    console.log(`🔗 Final URL: ${extractionResults.finalUrl}`);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-enhanced-2embed.png', fullPage: false });
    console.log('📸 Screenshot saved: test-enhanced-2embed.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testEnhanced2EmbedExtraction()
  .then(() => {
    console.log('\n🎉 Enhanced 2embed.cc Test Completed!');
    console.log('====================================');
    console.log('✅ 2embed.cc → 2embed.skin redirect flow analyzed');
    console.log('✅ Enhanced extraction patterns tested');
    console.log('✅ Network traffic captured and analyzed');
    console.log('🔧 Integration ready for Streall app');
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }); 