const puppeteer = require('puppeteer');

async function testRedirectFollower() {
  console.log('🔗 Testing Redirect Follower');
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
    
    // Monitor console messages focused on redirects
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔗') || text.includes('redirect') || text.includes('Following') || 
          text.includes('provider') || text.includes('chain')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if RedirectFollower is available
    const followerCheck = await page.evaluate(() => {
      return {
        RedirectFollower: typeof window.RedirectFollower,
        followRedirectChain: typeof window.RedirectFollower?.followRedirectChain
      };
    });
    
    console.log('🔧 RedirectFollower availability:', followerCheck);

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
      console.log('🖱️ Button clicked');
      
      // Monitor for 25 seconds (redirect following timeout)
      console.log('⏳ Monitoring redirect following for 25 seconds...');
      await new Promise(resolve => setTimeout(resolve, 25000));
      
      // Check if video element appeared (successful extraction)
      const videoCheck = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? {
          exists: true,
          src: video.src,
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState,
          error: video.error ? video.error.message : null
        } : { exists: false };
      });
      
      console.log('\n📺 Video element check:', videoCheck);
      
      // Manual test of redirect follower
      console.log('\n🧪 Manual redirect follower test...');
      const manualTest = await page.evaluate(async () => {
        try {
          if (window.RedirectFollower && window.RedirectFollower.followRedirectChain) {
            console.log('🔗 Manually calling RedirectFollower.followRedirectChain...');
            const redirectChain = await window.RedirectFollower.followRedirectChain('https://www.2embed.cc/embed/574475');
            
            // Also generate streaming URLs
            const streamingUrls = window.RedirectFollower.generateStreamingUrls(redirectChain);
            
            return { 
              success: true, 
              redirectChain, 
              streamingUrls,
              error: null 
            };
          } else {
            return { success: false, redirectChain: null, streamingUrls: [], error: 'RedirectFollower not available' };
          }
        } catch (error) {
          return { success: false, redirectChain: null, streamingUrls: [], error: error.message };
        }
      });
      
      console.log('🧪 Manual test result:', manualTest);
      
      if (manualTest.redirectChain) {
        console.log('\n🔗 Redirect Chain Details:');
        console.log(`   Original URL: ${manualTest.redirectChain.originalUrl}`);
        console.log(`   Final URL: ${manualTest.redirectChain.finalUrl}`);
        console.log(`   Streaming Provider: ${manualTest.redirectChain.streamingProvider}`);
        console.log(`   Embed Type: ${manualTest.redirectChain.embedType}`);
        console.log(`   Redirects: ${manualTest.redirectChain.redirects.length}`);
        
        if (manualTest.redirectChain.redirects.length > 0) {
          console.log('\n📍 Redirect Steps:');
          manualTest.redirectChain.redirects.forEach((url, i) => {
            console.log(`   ${i + 1}: ${url}`);
          });
        }
      }
      
      if (manualTest.streamingUrls && manualTest.streamingUrls.length > 0) {
        console.log('\n🎯 Generated streaming URLs:');
        manualTest.streamingUrls.forEach((url, i) => {
          console.log(`   ${i + 1}: ${url}`);
        });
      }
      
    } else {
      console.log('❌ Extract button not found');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 20 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testRedirectFollower(); 