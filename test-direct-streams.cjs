const puppeteer = require('puppeteer');

async function testDirectStreams() {
  console.log('🎯 Testing Direct Stream URLs');
  console.log('==============================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor console messages focused on direct streams
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('🎬') || text.includes('🧪') || 
          text.includes('Direct') || text.includes('stream') || text.includes('Testing') ||
          text.includes('✅') || text.includes('❌')) {
        console.log(`🖥️ [${msg.type()}] ${text}`);
      }
    });
    
    // Navigate to movie page
    console.log('\n🎬 Loading movie page...');
    await page.goto('http://localhost:5177/watch/movie/574475', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if DirectStreamUrls is available
    const extractorCheck = await page.evaluate(() => {
      return {
        DirectStreamUrls: typeof window.DirectStreamUrls,
        generateStreamUrls: typeof window.DirectStreamUrls?.generateStreamUrls,
        getWorkingStreams: typeof window.DirectStreamUrls?.getWorkingStreams,
        testStreamUrl: typeof window.DirectStreamUrls?.testStreamUrl
      };
    });
    
    console.log('🔧 DirectStreamUrls availability:', extractorCheck);

    if (extractorCheck.DirectStreamUrls === 'function') {
      // Test direct stream URL generation
      console.log('\n🧪 Testing DirectStreamUrls.generateStreamUrls...');
      const generateTest = await page.evaluate(() => {
        try {
          const streams = window.DirectStreamUrls.generateStreamUrls('574475', 'movie');
          return { success: true, streams, error: null };
        } catch (error) {
          return { success: false, streams: [], error: error.message };
        }
      });
      
      console.log('🧪 Generate test result:', {
        success: generateTest.success,
        streamCount: generateTest.streams.length,
        error: generateTest.error
      });
      
      if (generateTest.streams && generateTest.streams.length > 0) {
        console.log('\n🎯 Generated Stream URLs:');
        generateTest.streams.forEach((stream, i) => {
          console.log(`   ${i + 1}: ${stream.provider} - ${stream.label}`);
          console.log(`      URL: ${stream.url}`);
          console.log(`      Type: ${stream.type}, Quality: ${stream.quality}`);
          console.log('');
        });
      }
      
      // Test working streams detection
      console.log('\n🧪 Testing DirectStreamUrls.getWorkingStreams...');
      const workingTest = await page.evaluate(async () => {
        try {
          console.log('🎯 Calling getWorkingStreams...');
          const workingStreams = await window.DirectStreamUrls.getWorkingStreams('574475', 'movie');
          return { success: true, workingStreams, error: null };
        } catch (error) {
          return { success: false, workingStreams: [], error: error.message };
        }
      });
      
      console.log('🧪 Working streams test result:', {
        success: workingTest.success,
        workingStreamCount: workingTest.workingStreams.length,
        error: workingTest.error
      });
      
      if (workingTest.workingStreams && workingTest.workingStreams.length > 0) {
        console.log('\n🏆 Working Stream URLs:');
        workingTest.workingStreams.forEach((stream, i) => {
          console.log(`   ${i + 1}: ${stream.provider} - ${stream.label}`);
          console.log(`      URL: ${stream.url}`);
          console.log(`      Type: ${stream.type}, Quality: ${stream.quality}`);
          console.log('');
        });
        
        // Test the first working stream in a video element
        console.log('\n📺 Testing first working stream in video element...');
        const videoTest = await page.evaluate((streamUrl) => {
          try {
            // Create a test video element
            const video = document.createElement('video');
            video.style.width = '400px';
            video.style.height = '300px';
            video.controls = true;
            video.crossOrigin = 'anonymous';
            video.src = streamUrl;
            
            // Add to page for testing
            document.body.appendChild(video);
            
            return {
              success: true,
              videoSrc: video.src,
              videoElement: 'added to page'
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }, workingTest.workingStreams[0].url);
        
        console.log('📺 Video test result:', videoTest);
      }
      
      // Test individual stream URLs
      console.log('\n🧪 Testing individual stream URLs...');
      const individualTests = await page.evaluate(async () => {
        const testUrls = [
          'https://streamsrcs.2embed.cc/hnszpnmex8h4?embed=1&referer=streamsrcs.2embed.cc&adb=1&hls4=1',
          'https://streamsrcs.2embed.cc/swish?id=hnszpnmex8h4&ref=' + window.location.origin,
          'https://streamsrcs.2embed.cc/hnszpnmex8h4',
          'https://vidsrc.cc/v2/embed/movie/574475'
        ];
        
        const results = [];
        for (const url of testUrls) {
          try {
            const isWorking = await window.DirectStreamUrls.testStreamUrl(url);
            results.push({ url, isWorking, error: null });
          } catch (error) {
            results.push({ url, isWorking: false, error: error.message });
          }
        }
        
        return results;
      });
      
      console.log('\n🔍 Individual URL test results:');
      individualTests.forEach((result, i) => {
        console.log(`   ${i + 1}: ${result.isWorking ? '✅' : '❌'} ${result.url}`);
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
      
    } else {
      console.log('❌ DirectStreamUrls not available in browser');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    console.log('💡 You can manually test the stream URLs in the video elements');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testDirectStreams(); 