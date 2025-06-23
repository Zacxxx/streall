const puppeteer = require('puppeteer');

async function testInteractiveRedirect() {
  console.log('🔗 Testing Interactive Redirect Following');
  console.log('=========================================');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Monitor all navigation events
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`🔗 Main frame navigated to: ${frame.url()}`);
      } else {
        console.log(`📺 Iframe navigated to: ${frame.url()}`);
      }
    });
    
    // Monitor all network requests to see redirects
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      // Log redirects and important responses
      if (status >= 300 && status < 400) {
        console.log(`🔄 Redirect ${status}: ${url}`);
      } else if (url.includes('embed') || url.includes('player') || url.includes('stream') ||
                 url.includes('vidplay') || url.includes('filemoon') || url.includes('streamwish')) {
        console.log(`🌐 Response ${status}: ${url}`);
      }
    });
    
    // Navigate directly to 2embed.cc
    const embedUrl = 'https://www.2embed.cc/embed/574475';
    console.log(`\n🎬 Loading: ${embedUrl}`);
    
    await page.goto(embedUrl, { waitUntil: 'networkidle2' });
    console.log('✅ Initial page loaded');
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check current URL after any automatic redirects
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Look for clickable elements
    const clickableElements = await page.evaluate(() => {
      const elements = [];
      
      // Look for various play buttons and clickable elements
      const selectors = [
        'button', 'div[onclick]', '.play', '.player', '.poster',
        '[data-play]', 'img[src*="play"]', '.movie-poster',
        '[style*="cursor: pointer"]', '[onclick]'
      ];
      
      selectors.forEach(selector => {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) { // Visible elements only
            elements.push({
              selector,
              text: el.textContent?.trim() || '',
              onclick: !!el.onclick,
              hasDataPlay: !!el.dataset.play,
              tagName: el.tagName,
              className: el.className,
              id: el.id
            });
          }
        });
      });
      
      return elements;
    });
    
    console.log(`\n🔍 Found ${clickableElements.length} clickable elements:`);
    clickableElements.forEach((el, i) => {
      console.log(`   ${i + 1}: ${el.tagName}.${el.className} - "${el.text}" (onclick: ${el.onclick})`);
    });
    
    // Try clicking the most promising element
    if (clickableElements.length > 0) {
      console.log('\n🖱️ Attempting to click play elements...');
      
      // Try clicking elements in order of priority
      const clickResults = await page.evaluate(() => {
        const results = [];
        
        // Priority order for clicking
        const selectors = [
          'div[onclick]',
          '.play',
          '.player', 
          '.poster',
          'button',
          'img[src*="play"]'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            try {
              console.log(`Clicking: ${selector}`);
              element.click();
              results.push({ selector, success: true, error: null });
              break; // Only click the first one found
            } catch (error) {
              results.push({ selector, success: false, error: error.message });
            }
          }
        }
        
        return results;
      });
      
      console.log('🖱️ Click results:', clickResults);
      
      // Wait for potential navigation/redirect
      console.log('⏳ Waiting for redirects...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if URL changed
      const newUrl = page.url();
      if (newUrl !== currentUrl) {
        console.log(`🎯 URL changed to: ${newUrl}`);
        
        // Detect the streaming provider
        const provider = detectProvider(newUrl);
        console.log(`🎬 Detected provider: ${provider}`);
        
        // Wait a bit more for the player to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for video elements or iframes in the new page
        const mediaElements = await page.evaluate(() => {
          return {
            videos: Array.from(document.querySelectorAll('video')).map(v => ({
              src: v.src,
              currentSrc: v.currentSrc,
              poster: v.poster
            })),
            iframes: Array.from(document.querySelectorAll('iframe')).map(i => ({
              src: i.src,
              width: i.width,
              height: i.height
            })),
            scripts: Array.from(document.querySelectorAll('script')).length,
            bodyLength: document.body.innerHTML.length
          };
        });
        
        console.log('\n📺 Media elements in redirected page:');
        console.log(`   Videos: ${mediaElements.videos.length}`);
        console.log(`   Iframes: ${mediaElements.iframes.length}`);
        console.log(`   Scripts: ${mediaElements.scripts}`);
        console.log(`   Body length: ${mediaElements.bodyLength}`);
        
        if (mediaElements.videos.length > 0) {
          console.log('\n🎬 Video sources found:');
          mediaElements.videos.forEach((video, i) => {
            console.log(`   ${i + 1}: ${video.src || video.currentSrc || 'No source'}`);
          });
        }
        
        if (mediaElements.iframes.length > 0) {
          console.log('\n📺 Iframes found:');
          mediaElements.iframes.forEach((iframe, i) => {
            console.log(`   ${i + 1}: ${iframe.src}`);
          });
        }
        
      } else {
        console.log('❌ No URL change detected after clicking');
      }
    } else {
      console.log('❌ No clickable elements found');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser staying open for 30 seconds for manual inspection...');
    console.log('💡 Try manually clicking play buttons to see what happens');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function detectProvider(url) {
  const providers = [
    { name: 'vidplay', patterns: ['vidplay', 'vid-play'] },
    { name: 'filemoon', patterns: ['filemoon', 'file-moon'] },
    { name: 'streamwish', patterns: ['streamwish', 'stream-wish'] },
    { name: 'doodstream', patterns: ['doodstream', 'dood'] },
    { name: 'streamtape', patterns: ['streamtape'] },
    { name: 'mixdrop', patterns: ['mixdrop'] },
    { name: 'upstream', patterns: ['upstream'] },
    { name: 'streamingnow', patterns: ['streamingnow'] },
    { name: '2embed', patterns: ['2embed'] }
  ];
  
  const urlLower = url.toLowerCase();
  
  for (const provider of providers) {
    if (provider.patterns.some(pattern => urlLower.includes(pattern))) {
      return provider.name;
    }
  }
  
  return 'unknown';
}

testInteractiveRedirect(); 