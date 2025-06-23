const puppeteer = require('puppeteer');

async function debugInjectionDetailed() {
  console.log('🔍 Detailed Injection Debug');
  console.log('==========================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor ALL console messages with detailed logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎬') || text.includes('🎯') || text.includes('injection') || text.includes('iframe')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Count initial iframes
    const initialIframes = await page.evaluate(() => document.querySelectorAll('iframe').length);
    console.log(`📺 Initial iframe count: ${initialIframes}`);

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
      
      // Monitor iframe creation
      const iframeMonitor = setInterval(async () => {
        const currentIframes = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe'));
          return iframes.map((iframe, i) => ({
            index: i,
            src: iframe.src,
            display: getComputedStyle(iframe).display,
            position: getComputedStyle(iframe).position,
            width: iframe.style.width,
            height: iframe.style.height,
            hidden: iframe.style.display === 'none'
          }));
        });
        
        if (currentIframes.length > initialIframes) {
          console.log(`📺 New iframe detected! Count: ${currentIframes.length}`);
          currentIframes.forEach((iframe, i) => {
            if (i >= initialIframes) {
              console.log(`   New iframe ${i}: ${iframe.src}`);
              console.log(`   Hidden: ${iframe.hidden}, Display: ${iframe.display}`);
            }
          });
        }
      }, 1000);
      
      // Click the button
      await extractButton.asElement().click();
      console.log('🖱️ Button clicked');
      
      // Monitor for 15 seconds
      console.log('⏳ Monitoring injection for 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      clearInterval(iframeMonitor);
      
      // Final iframe count
      const finalIframes = await page.evaluate(() => document.querySelectorAll('iframe').length);
      console.log(`📺 Final iframe count: ${finalIframes}`);
      
      // Check if injection functions are available
      const injectionCheck = await page.evaluate(() => {
        return {
          StreamInjector: typeof window.StreamInjector,
          extractStreamsWithInjection: typeof window.StreamInjector?.extractStreamsWithInjection,
          customVideoPlayer: !!document.querySelector('video[src]')
        };
      });
      
      console.log('🔧 Injection availability:', injectionCheck);
      
      // Try to manually trigger injection to see what happens
      console.log('\n🧪 Manual injection test...');
      const manualTest = await page.evaluate(async () => {
        try {
          if (window.StreamInjector && window.StreamInjector.extractStreamsWithInjection) {
            console.log('🎯 Manually calling extractStreamsWithInjection...');
            const streams = await window.StreamInjector.extractStreamsWithInjection('https://www.2embed.cc/embed/574475');
            return { success: true, streams: streams.length, error: null };
          } else {
            return { success: false, streams: 0, error: 'StreamInjector not available' };
          }
        } catch (error) {
          return { success: false, streams: 0, error: error.message };
        }
      });
      
      console.log('🧪 Manual test result:', manualTest);
      
    } else {
      console.log('❌ Extract button not found');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 20 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugInjectionDetailed(); 