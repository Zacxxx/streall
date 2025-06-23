const puppeteer = require('puppeteer');

async function testDynamicStreamCapture() {
  console.log('🎬 Testing Dynamic Stream Capture System');
  console.log('=====================================');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set up comprehensive request interception
    const capturedRequests = [];
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      
      // Log all requests for analysis
      capturedRequests.push({
        url,
        resourceType,
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
      
      // Check if it's a potential stream URL
      const isStreamUrl = /\.(m3u8|mp4|webm|mkv|avi|mov|flv)(\?|$)/i.test(url) ||
                         /\/manifest\.mpd/i.test(url) ||
                         /\/playlist\.m3u8/i.test(url) ||
                         /streamsrcs\.|vidsrc\.|player4u\./i.test(url);
      
      if (isStreamUrl) {
        console.log('🎯 POTENTIAL STREAM URL DETECTED:', url);
        console.log('   Resource Type:', resourceType);
        console.log('   Method:', request.method());
      }
      
      request.continue();
    });
    
    // Set up response monitoring
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      
      // Log important responses
      if (url.includes('streamsrcs') || url.includes('2embed') || url.includes('vidsrc')) {
        console.log(`📡 Response: ${status} - ${url}`);
        
        if (status === 404) {
          console.log('❌ 404 Error detected for:', url);
        } else if (status >= 200 && status < 300) {
          console.log('✅ Successful response for:', url);
          
          // Try to get response body for analysis
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json')) {
              const body = await response.text();
              console.log('📄 JSON Response body preview:', body.substring(0, 200));
            }
          } catch (e) {
            // Ignore response body errors
          }
        }
      }
    });

    // Navigate to Streall app
    console.log('🚀 Navigating to Streall app...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    // Wait for app to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Navigate to the test movie
    console.log('🎬 Navigating to movie player...');
    await page.goto('http://localhost:5174/watch/movie/574475', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for player to initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if the dynamic stream capture button exists
    console.log('🔍 Looking for dynamic stream capture button...');
    const buttonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const extractBtn = buttons.find(btn => 
        btn.textContent.includes('Dynamic Stream Capture') ||
        btn.textContent.includes('🎬') ||
        btn.className.includes('extract')
      );
      
      if (extractBtn) {
        extractBtn.click();
        return true;
      }
      return false;
    });
    
    if (buttonFound) {
      console.log('✅ Found and clicked extract button');
      
      // Check for iframe sandbox attributes
      console.log('🛡️ Checking for ad-blocking sandbox attributes...');
      const sandboxInfo = await page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        return iframes.map(iframe => ({
          src: iframe.src,
          sandbox: iframe.getAttribute('sandbox'),
          allowFullScreen: iframe.allowFullScreen
        }));
      });
      
      for (const info of sandboxInfo) {
        if (info.sandbox) {
          console.log(`✅ Iframe with sandbox found: ${info.src}`);
          console.log(`   Sandbox: ${info.sandbox}`);
          
          // Verify ad-blocking attributes
          const hasAdBlocking = !info.sandbox.includes('allow-popups') && 
                               !info.sandbox.includes('allow-top-navigation') &&
                               !info.sandbox.includes('allow-modals');
          
          if (hasAdBlocking) {
            console.log('🛡️ Ad-blocking sandbox configuration confirmed!');
          } else {
            console.log('⚠️ Sandbox may not block all ads');
          }
        } else {
          console.log(`❌ Iframe without sandbox: ${info.src}`);
        }
      }
      
      // Wait for stream capture to complete
      console.log('⏳ Waiting for stream capture (30 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check browser console for stream capture results
      const logs = await page.evaluate(() => {
        return window.console._logs || [];
      });
      
      console.log('📊 Browser console logs:', logs);
      
    } else {
      console.log('❌ Extract button not found, trying direct method...');
      
      // Try to call the dynamic stream capture directly
      const result = await page.evaluate(async () => {
        // Check if DynamicStreamCapture is available
        if (window.DynamicStreamCapture) {
          console.log('🎬 DynamicStreamCapture found, testing...');
          
          const embedUrl = 'https://www.2embed.cc/embed/574475';
          const result = await window.DynamicStreamCapture.captureRealStreams(embedUrl);
          
          return {
            success: result.success,
            streamCount: result.streams?.length || 0,
            streams: result.streams || [],
            error: result.error
          };
        } else {
          return { error: 'DynamicStreamCapture not available in window scope' };
        }
      });
      
      console.log('🎯 Direct capture result:', result);
    }
    
    // Analyze captured network requests
    console.log('\n📊 NETWORK ANALYSIS');
    console.log('===================');
    
    const streamRequests = capturedRequests.filter(req => 
      /\.(m3u8|mp4|webm|mkv)(\?|$)/i.test(req.url) ||
      /streamsrcs\.|vidsrc\.|player4u\./i.test(req.url) ||
      req.url.includes('stream') || req.url.includes('video')
    );
    
    console.log(`📈 Total requests captured: ${capturedRequests.length}`);
    console.log(`🎯 Potential stream requests: ${streamRequests.length}`);
    
    if (streamRequests.length > 0) {
      console.log('\n🎬 STREAM REQUESTS FOUND:');
      streamRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.url}`);
        console.log(`   Type: ${req.resourceType}, Method: ${req.method}`);
      });
    }
    
    // Check for 2embed.cc specific requests
    const embedRequests = capturedRequests.filter(req => 
      req.url.includes('2embed') || req.url.includes('streamsrcs')
    );
    
    if (embedRequests.length > 0) {
      console.log('\n🔗 2EMBED.CC REQUESTS:');
      embedRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.url}`);
      });
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'test-dynamic-capture.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as test-dynamic-capture.png');
    
    // Wait a bit more to see if any delayed requests come through
    console.log('⏳ Waiting for delayed requests...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testDynamicStreamCapture().catch(console.error); 