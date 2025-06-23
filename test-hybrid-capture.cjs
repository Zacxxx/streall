const puppeteer = require('puppeteer');

async function testHybridCapture() {
  console.log('🔍 Testing Hybrid Stream Capture');
  console.log('=================================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor console messages with stream capture focus
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('🌐') || text.includes('Stream') || 
          text.includes('capture') || text.includes('network')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if StreamCapture is available
    const captureCheck = await page.evaluate(() => {
      return {
        StreamCapture: typeof window.StreamCapture,
        captureStreamsFromEmbed: typeof window.StreamCapture?.captureStreamsFromEmbed
      };
    });
    
    console.log('🔧 StreamCapture availability:', captureCheck);

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
      
      // Monitor for 30 seconds (hybrid capture timeout)
      console.log('⏳ Monitoring hybrid capture for 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
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
      
      // Check iframe count
      const iframeCount = await page.evaluate(() => document.querySelectorAll('iframe').length);
      console.log(`📺 Total iframes on page: ${iframeCount}`);
      
      // Manual test of hybrid capture
      console.log('\n🧪 Manual hybrid capture test...');
      const manualTest = await page.evaluate(async () => {
        try {
          if (window.StreamCapture && window.StreamCapture.captureStreamsFromEmbed) {
            console.log('🎯 Manually calling StreamCapture.captureStreamsFromEmbed...');
            const streams = await window.StreamCapture.captureStreamsFromEmbed('https://www.2embed.cc/embed/574475');
            return { success: true, streams: streams.length, streamsData: streams, error: null };
          } else {
            return { success: false, streams: 0, streamsData: [], error: 'StreamCapture not available' };
          }
        } catch (error) {
          return { success: false, streams: 0, streamsData: [], error: error.message };
        }
      });
      
      console.log('🧪 Manual test result:', manualTest);
      
      if (manualTest.streamsData && manualTest.streamsData.length > 0) {
        console.log('\n🎯 Captured streams:');
        manualTest.streamsData.forEach((stream, i) => {
          console.log(`   ${i + 1}: ${stream.type} - ${stream.url}`);
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

testHybridCapture(); 