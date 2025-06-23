export interface DynamicStreamUrl {
  url: string;
  type: 'hls' | 'mp4' | 'webm' | 'dash' | 'unknown';
  quality: string;
  headers?: Record<string, string>;
  cookies?: string;
  referer?: string;
}

export interface StreamCaptureResult {
  success: boolean;
  streams: DynamicStreamUrl[];
  embedUrl: string;
  sessionInfo?: {
    cookies: string;
    referer: string;
    userAgent: string;
  };
  error?: string;
}

export class DynamicStreamCapture {
  /**
   * Capture real stream URLs using headless browser automation
   */
  static async captureRealStreams(embedUrl: string): Promise<StreamCaptureResult> {
    console.log('🎬 Starting dynamic stream capture for:', embedUrl);
    
    return new Promise((resolve) => {
      // Create hidden iframe to load the embed page
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
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
      
      const capturedStreams: DynamicStreamUrl[] = [];
      const capturedRequests = new Set<string>();
      let resolved = false;
      
      // Timeout after 30 seconds
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(iframe);
          resolve({
            success: capturedStreams.length > 0,
            streams: capturedStreams,
            embedUrl,
            error: capturedStreams.length === 0 ? 'No streams captured within timeout' : undefined
          });
        }
      }, 30000);
      
      // Intercept network requests globally
      const originalFetch = window.fetch;
      const originalXHROpen = XMLHttpRequest.prototype.open;
      const originalXHRSend = XMLHttpRequest.prototype.send;
      
      // Track captured URLs to avoid duplicates
      const captureStream = (url: string, headers?: Record<string, string>) => {
        if (capturedRequests.has(url)) return;
        
        if (this.isStreamUrl(url)) {
          console.log('🎯 Captured dynamic stream URL:', url);
          capturedRequests.add(url);
          
          const streamType = this.detectStreamType(url);
          const quality = this.extractQuality(url);
          
          capturedStreams.push({
            url,
            type: streamType,
            quality,
            headers,
            referer: embedUrl,
            cookies: document.cookie
          });
        }
      };
      
      // Intercept fetch requests
      window.fetch = async (...args) => {
        const url = args[0]?.toString() || '';
        const options = args[1] || {};
        
        // Capture the request
        captureStream(url, options.headers as Record<string, string>);
        
        try {
          const response = await originalFetch(...args);
          
          // Also check response URL in case of redirects
          if (response.url && response.url !== url) {
            captureStream(response.url);
          }
          
          return response;
        } catch (error) {
          return originalFetch(...args);
        }
      };
      
      // Intercept XMLHttpRequest
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._capturedUrl = url.toString();
        return originalXHROpen.call(this, method, url, ...args);
      };
      
      XMLHttpRequest.prototype.send = function(...args) {
        if (this._capturedUrl) {
          captureStream(this._capturedUrl);
        }
        return originalXHRSend.call(this, ...args);
      };
      
      iframe.onload = async () => {
        console.log('📺 Embed page loaded, monitoring for streams...');
        
        try {
          // Wait for initial page load
          await new Promise(r => setTimeout(r, 3000));
          
          // Try to access iframe content and trigger player interactions
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
              console.log('🎮 Attempting to trigger player interactions...');
              
              // Look for and click play buttons
              const playSelectors = [
                'button[aria-label*="play"]',
                '.play-button',
                '.play-btn',
                '.playbtn',
                '[data-play]',
                'button:contains("Play")',
                '.vjs-big-play-button',
                '.jwplayer .jw-display-icon-container',
                'video',
                '[onclick*="play"]'
              ];
              
              for (const selector of playSelectors) {
                const elements = iframeDoc.querySelectorAll(selector);
                for (const element of elements) {
                  try {
                    console.log(`🖱️ Clicking ${selector}...`);
                    (element as HTMLElement).click();
                    await new Promise(r => setTimeout(r, 2000));
                  } catch (e) {
                    // Ignore click errors
                  }
                }
              }
              
              // Also try dispatching events
              const videos = iframeDoc.querySelectorAll('video');
              videos.forEach(video => {
                try {
                  video.play();
                  video.dispatchEvent(new Event('play'));
                  video.dispatchEvent(new Event('loadstart'));
                } catch (e) {
                  // Ignore errors
                }
              });
            }
          } catch (error) {
            console.log('⚠️ Cannot access iframe content due to CORS, monitoring network only');
          }
          
          // Continue monitoring for additional streams
          await new Promise(r => setTimeout(r, 15000));
          
          // Try to trigger more interactions
          setTimeout(() => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                // Try clicking anywhere on the page
                const clickEvent = new MouseEvent('click', { bubbles: true });
                iframeDoc.body?.dispatchEvent(clickEvent);
                
                // Try keyboard events
                const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
                iframeDoc.body?.dispatchEvent(spaceEvent);
              }
            } catch (e) {
              // Ignore errors
            }
          }, 10000);
          
        } catch (error) {
          console.error('Error during stream capture:', error);
        }
      };
      
      iframe.onerror = () => {
        console.error('Failed to load embed iframe');
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          
          // Restore original functions
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXHROpen;
          XMLHttpRequest.prototype.send = originalXHRSend;
          
          document.body.removeChild(iframe);
          resolve({
            success: false,
            streams: [],
            embedUrl,
            error: 'Failed to load embed iframe'
          });
        }
      };
      
      // Final cleanup and resolution
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          
          // Restore original functions
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXHROpen;
          XMLHttpRequest.prototype.send = originalXHRSend;
          
          document.body.removeChild(iframe);
          
          console.log(`🎬 Stream capture completed. Found ${capturedStreams.length} streams.`);
          resolve({
            success: capturedStreams.length > 0,
            streams: capturedStreams,
            embedUrl,
            sessionInfo: {
              cookies: document.cookie,
              referer: embedUrl,
              userAgent: navigator.userAgent
            }
          });
        }
      }, 25000);
      
      document.body.appendChild(iframe);
    });
  }
  
  /**
   * Check if URL is a video stream
   */
  private static isStreamUrl(url: string): boolean {
    const streamPatterns = [
      // Direct video files
      /\.m3u8(\?|$)/i,
      /\.mp4(\?|$)/i,
      /\.webm(\?|$)/i,
      /\.mkv(\?|$)/i,
      /\.avi(\?|$)/i,
      /\.mov(\?|$)/i,
      /\.flv(\?|$)/i,
      
      // Streaming manifests
      /\/manifest\.mpd/i,
      /\/playlist\.m3u8/i,
      /\/index\.m3u8/i,
      
      // Stream endpoints with parameters
      /[?&](video|stream|media|file)=/i,
      /[?&]format=(mp4|webm|hls)/i,
      /[?&]type=(video|stream)/i,
      
      // Common streaming domains
      /\.cloudfront\.net.*\.(m3u8|mp4)/i,
      /\.amazonaws\.com.*\.(m3u8|mp4)/i,
      /cdn.*\.(m3u8|mp4)/i,
      
      // Specific streaming services
      /streamsrcs\..*\.(m3u8|mp4)/i,
      /vidsrc\..*\.(m3u8|mp4)/i,
      /player4u\..*\.(m3u8|mp4)/i,
      
      // Generic video hosting patterns
      /\/video\/.*\.(m3u8|mp4)/i,
      /\/stream\/.*\.(m3u8|mp4)/i,
      /\/media\/.*\.(m3u8|mp4)/i,
      
      // Base64 encoded or obfuscated URLs containing video extensions
      /[a-zA-Z0-9+\/=]+\.(m3u8|mp4)/i
    ];
    
    // Exclude common non-video URLs
    const excludePatterns = [
      /\.(css|js|json|xml|txt|html|htm)(\?|$)/i,
      /\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/i,
      /\.(woff|woff2|ttf|eot)(\?|$)/i,
      /google|facebook|twitter|analytics|ads|tracking/i
    ];
    
    // Check if URL should be excluded
    if (excludePatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    return streamPatterns.some(pattern => pattern.test(url));
  }
  
  /**
   * Detect stream type from URL
   */
  private static detectStreamType(url: string): DynamicStreamUrl['type'] {
    if (/\.m3u8/i.test(url) || /hls/i.test(url)) return 'hls';
    if (/\.mp4/i.test(url)) return 'mp4';
    if (/\.webm/i.test(url)) return 'webm';
    if (/\.mpd/i.test(url) || /dash/i.test(url)) return 'dash';
    return 'unknown';
  }
  
  /**
   * Extract quality from URL
   */
  private static extractQuality(url: string): string {
    const qualityPatterns = [
      /(\d{3,4})p/i,
      /quality[=:](\d{3,4})/i,
      /res[=:](\d{3,4})/i,
      /(720|1080|480|360|240)/i
    ];
    
    for (const pattern of qualityPatterns) {
      const match = url.match(pattern);
      if (match) {
        return `${match[1]}p`;
      }
    }
    
    return 'auto';
  }
  
  /**
   * Sort streams by preference
   */
  static sortStreamsByPreference(streams: DynamicStreamUrl[]): DynamicStreamUrl[] {
    return streams.sort((a, b) => {
      // Prefer HLS > MP4 > WebM > DASH > Unknown
      const typeOrder = { hls: 0, mp4: 1, webm: 2, dash: 3, unknown: 4 };
      const aTypeOrder = typeOrder[a.type] ?? 5;
      const bTypeOrder = typeOrder[b.type] ?? 5;
      
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // Prefer higher quality
      const aQuality = parseInt(a.quality) || 0;
      const bQuality = parseInt(b.quality) || 0;
      
      return bQuality - aQuality;
    });
  }
} 