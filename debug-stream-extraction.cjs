const puppeteer = require('puppeteer');

async function debugStreamExtraction() {
  console.log('🔍 Debug Stream Extraction Process');
  console.log('==================================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor ALL console messages
    page.on('console', msg => {
      console.log(`🖥️ [${msg.type()}] ${msg.text()}`);
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check current iframe
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });
    console.log(`📺 Current iframe: ${iframeSrc}`);

    // Find and click extract button
    console.log('\n🎯 Looking for extract button...');
    const extractButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(button => 
        button.textContent.includes('🎯 Extract Streams') || 
        button.textContent.includes('Extracting')
      );
    });

    if (extractButton && extractButton.asElement()) {
      console.log('✅ Extract button found, clicking...');
      
      // Click the button
      await extractButton.asElement().click();
      
      // Monitor for the next 10 seconds what happens
      console.log('⏳ Monitoring for 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if iframe changed
      const newIframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });
      
      if (newIframeSrc !== iframeSrc) {
        console.log(`📺 Iframe changed to: ${newIframeSrc}`);
      } else {
        console.log('📺 Iframe unchanged');
      }
      
      // Check if video element appeared
      const videoElement = await page.$('video');
      if (videoElement) {
        console.log('✅ Video element found!');
        
        const videoInfo = await page.evaluate(() => {
          const video = document.querySelector('video');
          return video ? {
            src: video.src,
            currentSrc: video.currentSrc,
            readyState: video.readyState,
            networkState: video.networkState
          } : null;
        });
        
        console.log('🎯 Video info:', videoInfo);
      } else {
        console.log('❌ No video element found');
      }
      
      // Check if there are any hidden iframes
      const allIframes = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        return iframes.map(iframe => ({
          src: iframe.src,
          style: iframe.style.cssText,
          display: getComputedStyle(iframe).display,
          position: getComputedStyle(iframe).position
        }));
      });
      
      console.log('\n📺 All iframes on page:');
      allIframes.forEach((iframe, i) => {
        console.log(`   ${i + 1}: ${iframe.src}`);
        console.log(`      Style: ${iframe.style}`);
        console.log(`      Display: ${iframe.display}, Position: ${iframe.position}`);
      });
      
      // Check if our injection script is working
      console.log('\n🔍 Checking injection status...');
      const injectionStatus = await page.evaluate(() => {
        return {
          extractFunction: typeof window.extractStreamsFunction,
          capturedStreams: typeof window.capturedStreams,
          getCapturedStreams: typeof window.getCapturedStreams
        };
      });
      
      console.log('🔧 Injection status:', injectionStatus);
      
    } else {
      console.log('❌ Extract button not found');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugStreamExtraction(); 