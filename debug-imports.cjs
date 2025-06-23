const puppeteer = require('puppeteer');

async function debugImports() {
  console.log('🔍 Debug Imports and Module Loading');
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
    
    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check what's available in the global scope
    const globalCheck = await page.evaluate(() => {
      return {
        window_keys: Object.keys(window).filter(key => key.includes('Stream') || key.includes('Extract')),
        StreamExtractor: typeof window.StreamExtractor,
        StreamInjector: typeof window.StreamInjector,
        CustomVideoPlayer: typeof window.CustomVideoPlayer,
        React: typeof window.React,
        extractStreamsFunction: typeof window.extractStreamsFunction
      };
    });
    
    console.log('🌍 Global scope check:', globalCheck);
    
    // Check if modules are loaded via script tags
    const scriptCheck = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(script => ({
        src: script.src,
        type: script.type,
        hasContent: script.textContent ? script.textContent.length > 0 : false,
        containsStreamInjector: script.textContent ? script.textContent.includes('StreamInjector') : false
      })).filter(script => script.src || script.containsStreamInjector);
    });
    
    console.log('📜 Script tags:', scriptCheck);
    
    // Try to access the module directly
    const moduleCheck = await page.evaluate(() => {
      try {
        // Check if we can access the module
        const result = {
          customVideoPlayerExists: !!document.querySelector('[class*="CustomVideoPlayer"]'),
          videoPlayerExists: !!document.querySelector('video'),
          iframeExists: !!document.querySelector('iframe'),
          hasReactComponents: !!document.querySelector('[data-reactroot]') || !!document.querySelector('#root')
        };
        
        // Try to find any reference to StreamInjector in the page source
        const pageSource = document.documentElement.outerHTML;
        result.pageContainsStreamInjector = pageSource.includes('StreamInjector');
        result.pageContainsStreamExtractor = pageSource.includes('StreamExtractor');
        
        return result;
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔧 Module check:', moduleCheck);
    
    // Check browser console for any module loading errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.text().includes('error') || msg.text().includes('Error') || 
          msg.text().includes('failed') || msg.text().includes('Failed')) {
        consoleMessages.push(msg.text());
      }
    });
    
    // Wait a bit more to capture any errors
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (consoleMessages.length > 0) {
      console.log('❌ Console errors found:');
      consoleMessages.forEach(msg => console.log(`   ${msg}`));
    } else {
      console.log('✅ No console errors found');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugImports(); 