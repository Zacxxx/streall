const puppeteer = require('puppeteer');

async function testRealStreamExtractor() {
  console.log('🎯 Testing Real Stream Extractor');
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
    
    // Monitor console messages focused on real stream extraction
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('🎬') || text.includes('streaming') || 
          text.includes('provider') || text.includes('Real') || text.includes('streamsrcs') ||
          text.includes('player4u') || text.includes('vidsrc')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if RealStreamExtractor is available
    const extractorCheck = await page.evaluate(() => {
      return {
        RealStreamExtractor: typeof window.RealStreamExtractor,
        extractFromTMDBId: typeof window.RealStreamExtractor?.extractFromTMDBId,
        getBestSources: typeof window.RealStreamExtractor?.getBestSources
      };
    });
    
    console.log('🔧 RealStreamExtractor availability:', extractorCheck);

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
      
      // Monitor for 30 seconds (real stream extraction timeout)
      console.log('⏳ Monitoring real stream extraction for 30 seconds...');
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
      
      // Manual test of real stream extractor
      console.log('\n🧪 Manual real stream extractor test...');
      const manualTest = await page.evaluate(async () => {
        try {
          if (window.RealStreamExtractor && window.RealStreamExtractor.extractFromTMDBId) {
            console.log('🎯 Manually calling RealStreamExtractor.extractFromTMDBId...');
            const providerResults = await window.RealStreamExtractor.extractFromTMDBId('574475', 'movie');
            
            // Also get best sources
            const bestSources = window.RealStreamExtractor.getBestSources(providerResults);
            
            return { 
              success: true, 
              providerResults, 
              bestSources,
              error: null 
            };
          } else {
            return { success: false, providerResults: [], bestSources: [], error: 'RealStreamExtractor not available' };
          }
        } catch (error) {
          return { success: false, providerResults: [], bestSources: [], error: error.message };
        }
      });
      
      console.log('🧪 Manual test result:', JSON.stringify(manualTest, null, 2));
      
      if (manualTest.providerResults && manualTest.providerResults.length > 0) {
        console.log('\n🎯 Provider Results Details:');
        manualTest.providerResults.forEach((result, i) => {
          console.log(`   Provider ${i + 1}: ${result.provider}`);
          console.log(`   Embed URL: ${result.embedUrl}`);
          console.log(`   Success: ${result.success}`);
          console.log(`   Sources: ${result.sources ? result.sources.length : 0}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
          if (result.sources && result.sources.length > 0) {
            console.log(`   Stream URLs:`);
            result.sources.forEach((source, j) => {
              console.log(`     ${j + 1}: ${source.url} (${source.type})`);
            });
          }
          console.log('');
        });
      }
      
      if (manualTest.bestSources && manualTest.bestSources.length > 0) {
        console.log('\n🏆 Best sources found:');
        manualTest.bestSources.forEach((source, i) => {
          console.log(`   ${i + 1}: ${source.url}`);
          console.log(`      Type: ${source.type}`);
          console.log(`      Provider: ${source.provider}`);
          console.log(`      Quality: ${source.quality}`);
          console.log('');
        });
      }
      
    } else {
      console.log('❌ Extract button not found');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    console.log('💡 You can manually test the streaming providers');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testRealStreamExtractor(); 