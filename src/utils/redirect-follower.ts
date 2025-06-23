export interface RedirectChain {
  originalUrl: string;
  redirects: string[];
  finalUrl: string;
  streamingProvider: string;
  embedType: 'iframe' | 'direct' | 'unknown';
}

export class RedirectFollower {
  /**
   * Follow redirect chain from 2embed to actual streaming provider
   */
  static async followRedirectChain(embedUrl: string): Promise<RedirectChain> {
    console.log('🔗 Following redirect chain from:', embedUrl);
    
    return new Promise((resolve) => {
      // Create iframe to follow redirects
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      iframe.src = embedUrl;
      
      // Comprehensive ad-blocking sandbox configuration
      iframe.setAttribute('sandbox', 
        'allow-scripts ' +           // Allow JavaScript (needed for video players)
        'allow-same-origin ' +       // Allow same-origin requests
        'allow-forms ' +             // Allow form submission (some players need this)
        'allow-presentation ' +      // Allow fullscreen API
        'allow-orientation-lock ' +  // Allow screen orientation
        'allow-pointer-lock'         // Allow pointer lock for fullscreen
        // Explicitly NOT allowing:
        // - allow-popups (blocks popup ads)
        // - allow-popups-to-escape-sandbox (blocks popup escapes)
        // - allow-top-navigation (blocks navigation hijacking)
        // - allow-top-navigation-by-user-activation (blocks user-triggered navigation)
        // - allow-modals (blocks modal ads)
        // - allow-downloads (blocks unwanted downloads)
      );
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
      
      const redirects: string[] = [];
      let finalUrl = embedUrl;
      let streamingProvider = 'unknown';
      
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(iframe);
          
          const result: RedirectChain = {
            originalUrl: embedUrl,
            redirects,
            finalUrl,
            streamingProvider,
            embedType: 'unknown'
          };
          
          console.log('🔗 Redirect chain completed:', result);
          resolve(result);
        }
      }, 20000); // 20 second timeout
      
      // Monitor iframe URL changes
      let checkCount = 0;
      const urlMonitor = setInterval(() => {
        checkCount++;
        
        try {
          // Try to get current URL
          const currentUrl = iframe.contentWindow?.location?.href;
          if (currentUrl && currentUrl !== finalUrl && !redirects.includes(currentUrl)) {
            redirects.push(currentUrl);
            finalUrl = currentUrl;
            
            // Detect streaming provider
            streamingProvider = this.detectStreamingProvider(currentUrl);
            
            console.log(`🔗 Redirect ${redirects.length}: ${currentUrl} (${streamingProvider})`);
          }
        } catch (error) {
          // CORS error means we've hit the final destination
          console.log('🔒 CORS restriction hit - reached final destination');
        }
        
        // Stop after 40 checks (20 seconds)
        if (checkCount >= 40) {
          clearInterval(urlMonitor);
          
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            
            const result: RedirectChain = {
              originalUrl: embedUrl,
              redirects,
              finalUrl,
              streamingProvider,
              embedType: this.detectEmbedType(finalUrl)
            };
            
            console.log('🔗 Redirect chain completed:', result);
            resolve(result);
          }
        }
      }, 500);
      
      iframe.onload = () => {
        console.log('📺 Iframe loaded');
        
        // Try to simulate user interaction after 5 seconds
        setTimeout(() => {
          try {
            // Try to click play button or poster
            const clickResult = iframe.contentDocument?.evaluate(
              "//button[contains(text(), 'Play')] | //div[@onclick] | //*[contains(@class, 'play')] | //*[contains(@class, 'poster')]",
              iframe.contentDocument,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            
            const clickableElement = clickResult?.singleNodeValue as HTMLElement;
            if (clickableElement) {
              console.log('🖱️ Clicking play element');
              clickableElement.click();
            }
          } catch (error) {
            console.log('⚠️ Cannot interact with iframe content due to CORS');
          }
        }, 5000);
      };
      
      iframe.onerror = () => {
        console.log('❌ Iframe failed to load');
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          clearInterval(urlMonitor);
          document.body.removeChild(iframe);
          
          resolve({
            originalUrl: embedUrl,
            redirects: [],
            finalUrl: embedUrl,
            streamingProvider: 'error',
            embedType: 'unknown'
          });
        }
      };
      
      document.body.appendChild(iframe);
    });
  }
  
  /**
   * Detect streaming provider from URL
   */
  private static detectStreamingProvider(url: string): string {
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
  
  /**
   * Detect embed type from final URL
   */
  private static detectEmbedType(url: string): 'iframe' | 'direct' | 'unknown' {
    if (url.includes('embed') || url.includes('player')) {
      return 'iframe';
    }
    
    if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.webm')) {
      return 'direct';
    }
    
    return 'unknown';
  }
  
  /**
   * Generate direct streaming URLs for known providers
   */
  static generateStreamingUrls(redirectChain: RedirectChain): string[] {
    const urls: string[] = [];
    
    // Add the final URL
    urls.push(redirectChain.finalUrl);
    
    // Generate potential streaming URLs based on provider
    switch (redirectChain.streamingProvider) {
      case 'vidplay':
        // Vidplay often has predictable patterns
        urls.push(redirectChain.finalUrl.replace('/embed/', '/stream/'));
        urls.push(redirectChain.finalUrl + '?stream=1');
        break;
        
      case 'filemoon':
        // Filemoon patterns
        urls.push(redirectChain.finalUrl.replace('/embed/', '/file/'));
        urls.push(redirectChain.finalUrl + '/playlist.m3u8');
        break;
        
      case 'streamwish':
        // Streamwish patterns
        urls.push(redirectChain.finalUrl.replace('/embed/', '/stream/'));
        break;
        
      default:
        // Generic patterns
        urls.push(redirectChain.finalUrl + '/playlist.m3u8');
        urls.push(redirectChain.finalUrl + '/stream.mp4');
        urls.push(redirectChain.finalUrl.replace('/embed/', '/stream/'));
        break;
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }
  
  /**
   * Test if a URL is accessible and returns video content
   */
  static async testStreamUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // Avoid CORS issues
      });
      
      const contentType = response.headers.get('content-type') || '';
      return contentType.includes('video') || 
             contentType.includes('application/vnd.apple.mpegurl') || // HLS
             contentType.includes('application/dash+xml'); // DASH
    } catch (error) {
      // If we can't test it, assume it might work
      return true;
    }
  }
} 