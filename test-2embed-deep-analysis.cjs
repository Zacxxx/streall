const puppeteer = require('puppeteer');

async function deepAnalyze2embed() {
  console.log('🔍 Deep 2embed.skin Analysis');
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
      const url = request.url();
      requests.push({
        url,
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
      
      // Log interesting requests in real-time
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.webm') ||
          url.includes('stream') || url.includes('video') || url.includes('player') ||
          url.includes('embed') && !url.includes('favicon') && !url.includes('.css')) {
        console.log(`🌐 [${request.method()}] ${url}`);
      }
    });
    
    // Monitor console messages
    page.on('console', msg => {
      const text = msg.text();
      if (!text.includes('DevTools') && !text.includes('Lighthouse')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Navigate directly to 2embed.cc
    const embedUrl = 'https://www.2embed.cc/embed/574475';
    console.log(`\n🎬 Loading: ${embedUrl}`);
    
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });
    console.log('✅ Initial page loaded');
    
    // Monitor for dynamic changes over time
    let checkCount = 0;
    const maxChecks = 60; // 60 checks = 30 seconds
    
    const monitorChanges = setInterval(async () => {
      checkCount++;
      
      const currentAnalysis = await page.evaluate(() => {
        return {
          url: window.location.href,
          iframes: document.querySelectorAll('iframe').length,
          videos: document.querySelectorAll('video').length,
          buttons: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()),
          clickableElements: Array.from(document.querySelectorAll('[onclick], .play, .player, [data-play]')).length,
          hasJWPlayer: typeof window.jwplayer !== 'undefined',
          hasVideoJS: typeof window.videojs !== 'undefined',
          windowKeys: Object.keys(window).filter(key => 
            key.toLowerCase().includes('player') || 
            key.toLowerCase().includes('stream') || 
            key.toLowerCase().includes('video')
          ),
          bodyHTML: document.body.innerHTML.length
        };
      });
      
      if (checkCount === 1) {
        console.log(`\n⏰ Check ${checkCount}: Initial state`);
      } else if (checkCount % 10 === 0 || currentAnalysis.videos > 0 || currentAnalysis.iframes > 0) {
        console.log(`\n⏰ Check ${checkCount}:`);
        console.log(`   URL: ${currentAnalysis.url}`);
        console.log(`   Iframes: ${currentAnalysis.iframes}, Videos: ${currentAnalysis.videos}`);
        console.log(`   Clickable elements: ${currentAnalysis.clickableElements}`);
        console.log(`   Body HTML length: ${currentAnalysis.bodyHTML}`);
        
        if (currentAnalysis.buttons.length > 0) {
          console.log(`   Buttons: ${currentAnalysis.buttons.join(', ')}`);
        }
        
        if (currentAnalysis.windowKeys.length > 0) {
          console.log(`   Player keys: ${currentAnalysis.windowKeys.join(', ')}`);
        }
      }
      
      // Try clicking play button if found
      if (checkCount === 15) { // After 7.5 seconds
        console.log('\n🖱️ Looking for play button...');
        const playClicked = await page.evaluate(() => {
          // Look for play buttons
          const playSelectors = [
            '.play', '.player', '[data-play]', 'button[onclick]',
            'img[src*="play"]', 'div[onclick]', '.poster'
          ];
          
          for (const selector of playSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              console.log(`Found clickable element: ${selector}`);
              element.click();
              return true;
            }
          }
          
          // Try clicking on the poster/background
          const poster = document.querySelector('.poster, .movie-poster, [style*="background-image"]');
          if (poster) {
            console.log('Clicking poster element');
            poster.click();
            return true;
          }
          
          return false;
        });
        
        if (playClicked) {
          console.log('✅ Clicked play element');
        } else {
          console.log('❌ No play button found');
        }
      }
      
      // Stop monitoring if we find video or reach max checks
      if (currentAnalysis.videos > 0 || currentAnalysis.iframes > 0 || checkCount >= maxChecks) {
        clearInterval(monitorChanges);
        
        // Final analysis
        console.log('\n📊 Final Analysis:');
        console.log('==================');
        
        const finalAnalysis = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe'));
          const videos = Array.from(document.querySelectorAll('video'));
          
          return {
            url: window.location.href,
            title: document.title,
            iframes: iframes.map(iframe => ({
              src: iframe.src,
              width: iframe.width || iframe.style.width,
              height: iframe.height || iframe.style.height,
              display: getComputedStyle(iframe).display
            })),
            videos: videos.map(video => ({
              src: video.src,
              currentSrc: video.currentSrc,
              poster: video.poster,
              readyState: video.readyState,
              networkState: video.networkState
            })),
            bodyHTML: document.body.innerHTML
          };
        });
        
        console.log(`Final URL: ${finalAnalysis.url}`);
        console.log(`Iframes found: ${finalAnalysis.iframes.length}`);
        console.log(`Videos found: ${finalAnalysis.videos.length}`);
        
        if (finalAnalysis.iframes.length > 0) {
          console.log('\n📺 Iframes:');
          finalAnalysis.iframes.forEach((iframe, i) => {
            console.log(`   ${i + 1}: ${iframe.src}`);
          });
        }
        
        if (finalAnalysis.videos.length > 0) {
          console.log('\n🎬 Videos:');
          finalAnalysis.videos.forEach((video, i) => {
            console.log(`   ${i + 1}: ${video.src || video.currentSrc || 'No source'}`);
          });
        }
        
        // Check for stream URLs in final network requests
        const streamRequests = requests.filter(req => 
          req.url.includes('.m3u8') || req.url.includes('.mp4') || req.url.includes('.webm') ||
          req.url.includes('.mpd') || 
          (req.url.includes('stream') && !req.url.includes('css') && !req.url.includes('js'))
        );
        
        if (streamRequests.length > 0) {
          console.log('\n🎯 Stream requests found:');
          streamRequests.forEach((req, i) => {
            console.log(`   ${i + 1}: ${req.url}`);
          });
        }
        
        // Save page content for analysis
        const pageContent = finalAnalysis.bodyHTML;
        console.log(`\n📄 Page content length: ${pageContent.length} characters`);
        
        // Look for embedded URLs in the page content
        const urlPattern = /https?:\/\/[^\s"'<>]+/g;
        const urls = pageContent.match(urlPattern) || [];
        const streamUrls = urls.filter(url => 
          url.includes('.m3u8') || url.includes('.mp4') || url.includes('.webm') ||
          url.includes('stream') || url.includes('video') || url.includes('player')
        );
        
        if (streamUrls.length > 0) {
          console.log('\n🎯 URLs found in page content:');
          [...new Set(streamUrls)].forEach((url, i) => {
            console.log(`   ${i + 1}: ${url}`);
          });
        }
        
        console.log('\n🔍 Analysis complete. Browser staying open for manual inspection...');
      }
    }, 500); // Check every 500ms
    
    // Keep browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 45000)); // 45 seconds total

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

deepAnalyze2embed(); 