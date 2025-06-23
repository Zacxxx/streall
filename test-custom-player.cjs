const puppeteer = require('puppeteer');
const fs = require('fs');

async function testCustomVideoPlayer() {
  console.log('🚀 Testing Custom Video Player with Stream Extraction');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'log' || type === 'info') {
        console.log(`🔍 [${type.toUpperCase()}]`, text);
      } else if (type === 'error') {
        console.error(`❌ [${type.toUpperCase()}]`, text);
      } else if (type === 'warning') {
        console.warn(`⚠️ [${type.toUpperCase()}]`, text);
      }
    });

    // Monitor network requests
    const streamRequests = [];
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      
      // Log streaming-related requests
      if (url.includes('.m3u8') || 
          url.includes('.mp4') || 
          url.includes('stream') || 
          url.includes('multiembed') || 
          url.includes('streamingnow') ||
          url.includes('blob:')) {
        streamRequests.push({
          url,
          method: request.method(),
          headers: request.headers(),
          timestamp: new Date().toISOString()
        });
        console.log(`🌐 Stream request: ${request.method()} ${url}`);
      }
      
      request.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('stream')) {
        console.log(`📡 Stream response: ${response.status()} ${url}`);
      }
    });

    console.log('🔗 Navigating to Streall app...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    
    console.log('📍 Navigating to movie watch page...');
    await page.goto('http://localhost:5174/watch/movie/574475', { waitUntil: 'networkidle2' });
    
    // Wait for the custom video player to load
    console.log('⏳ Waiting for custom video player...');
    await page.waitForFunction(() => true, { timeout: 3000 }).catch(() => {});

    // Try to click the "Try Direct Stream" button if it's visible
    try {
      const directStreamButton = await page.$('button:has-text("🎯 Try Direct Stream")');
      if (directStreamButton) {
        console.log('🎯 Clicking "Try Direct Stream" button...');
        await directStreamButton.click();
        await page.waitForFunction(() => true, { timeout: 5000 }).catch(() => {}); // Wait for stream extraction
      }
    } catch (e) {
      console.log('ℹ️ Direct stream button not found or already active');
    }

    // Check for video element
    const videoElement = await page.$('video');
    if (videoElement) {
      const videoSrc = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.src : null;
      });
      
      if (videoSrc) {
        console.log('✅ Custom video player found with source:', videoSrc);
      } else {
        console.log('⚠️ Video element found but no source set');
      }
    } else {
      console.log('ℹ️ No video element found, likely using iframe fallback');
    }

    // Check for iframe fallback
    const iframeElement = await page.$('iframe');
    if (iframeElement) {
      const iframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });
      console.log('📺 Iframe fallback detected:', iframeSrc);
    }

    // Test stream extraction in the browser console
    console.log('🧪 Testing multi-level stream extraction...');
    const extractionResult = await page.evaluate(async () => {
      try {
        const embedUrl = 'https://multiembed.mov/?video_id=574475&tmdb=1';
        console.log('Step 1: Testing extraction from multiembed:', embedUrl);
        
        // Step 1: Get multiembed page
        const embedResponse = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!embedResponse.ok) {
          return { success: false, error: `Multiembed HTTP ${embedResponse.status}` };
        }
        
        const embedHtml = await embedResponse.text();
        console.log('Step 1 complete: Multiembed page fetched, length:', embedHtml.length);
        
        // Step 2: Look for redirect or streamingnow URLs
        const streamingNowMatches = embedHtml.match(/https?:\/\/streamingnow\.mov[^"'\s]*/gi);
        const redirectMatches = embedHtml.match(/(?:location\.href|window\.location)\s*=\s*["']([^"']+)["']/gi);
        
        let streamingNowUrl = null;
        if (streamingNowMatches && streamingNowMatches.length > 0) {
          streamingNowUrl = streamingNowMatches[0];
        } else if (redirectMatches && redirectMatches.length > 0) {
          const redirectMatch = redirectMatches[0].match(/["']([^"']+)["']/);
          if (redirectMatch) {
            streamingNowUrl = redirectMatch[1];
          }
        }
        
        if (!streamingNowUrl) {
          return { 
            success: false, 
            error: 'No streamingnow URL found',
            embedPageLength: embedHtml.length
          };
        }
        
        console.log('Step 2: Found streamingnow URL:', streamingNowUrl);
        
        // Step 3: Get streamingnow page
        const streamingResponse = await fetch(streamingNowUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://multiembed.mov/'
          }
        });
        
        if (!streamingResponse.ok) {
          return { success: false, error: `StreamingNow HTTP ${streamingResponse.status}` };
        }
        
        const streamingHtml = await streamingResponse.text();
        console.log('Step 3 complete: StreamingNow page fetched, length:', streamingHtml.length);
        
        // Step 4: Look for iframes in streamingnow page
        const iframeMatches = streamingHtml.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi);
        const iframeUrls = [];
        
        if (iframeMatches) {
          iframeMatches.forEach(match => {
            const srcMatch = match.match(/src\s*=\s*["']([^"']+)["']/i);
            if (srcMatch) {
              let iframeUrl = srcMatch[1];
              if (iframeUrl.startsWith('/')) {
                const baseUrl = new URL(streamingNowUrl);
                iframeUrl = `${baseUrl.protocol}//${baseUrl.host}${iframeUrl}`;
              }
              iframeUrls.push(iframeUrl);
            }
          });
        }
        
        console.log('Step 4 complete: Found', iframeUrls.length, 'iframes');
        
        // Step 5: Try to fetch the first iframe content
        let iframeStreamUrls = [];
        if (iframeUrls.length > 0) {
          try {
            const iframeResponse = await fetch(iframeUrls[0], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': streamingNowUrl
              }
            });
            
            if (iframeResponse.ok) {
              const iframeHtml = await iframeResponse.text();
              console.log('Step 5 complete: Iframe content fetched, length:', iframeHtml.length);
              
              // Look for stream URLs in iframe
              const patterns = [
                /['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/gi,
                /['"](https?:\/\/[^'"]*\.mp4[^'"]*)['"]/gi,
                /file\s*:\s*['"']([^'"]+)['"']/gi,
                /source\s*:\s*['"']([^'"]+)['"']/gi
              ];
              
              patterns.forEach(pattern => {
                const matches = iframeHtml.match(pattern);
                if (matches) {
                  matches.forEach(match => {
                    const urlMatch = match.match(/['"](https?:\/\/[^'"]+)['"]/);
                    if (urlMatch) {
                      iframeStreamUrls.push(urlMatch[1]);
                    }
                  });
                }
              });
            }
          } catch (e) {
            console.log('Step 5 failed:', e.message);
          }
        }
        
        return {
          success: true,
          embedPageLength: embedHtml.length,
          streamingNowUrl,
          streamingPageLength: streamingHtml.length,
          iframeUrls,
          iframeStreamUrls: iframeStreamUrls.slice(0, 10) // Limit output
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    console.log('🧪 Stream extraction test result:', extractionResult);

    // Wait for any additional network activity
    await page.waitForFunction(() => true, { timeout: 5000 }).catch(() => {});

    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'custom-player-test.png',
      fullPage: true
    });

    // Save network data
    console.log('💾 Saving network data...');
    fs.writeFileSync('custom-player-network.json', JSON.stringify({
      streamRequests,
      timestamp: new Date().toISOString(),
      extractionResult
    }, null, 2));

    console.log('✅ Custom video player test completed successfully!');
    console.log(`📊 Captured ${streamRequests.length} stream-related requests`);

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('- Custom video player loaded:', videoElement ? '✅' : '❌');
    console.log('- Video source found:', (await page.$('video[src]')) ? '✅' : '❌');
    console.log('- Iframe fallback detected:', iframeElement ? '✅' : '❌');
    console.log('- Stream extraction test:', extractionResult.success ? '✅' : '❌');
    console.log('- Stream requests captured:', streamRequests.length);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      console.log('🔚 Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testCustomVideoPlayer().catch(console.error); 