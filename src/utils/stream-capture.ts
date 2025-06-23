export interface StreamSource {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
  quality?: string;
  headers?: Record<string, string>;
}

export class StreamCapture {
  private static capturedUrls: Set<string> = new Set();
  private static streamSources: StreamSource[] = [];
  
  /**
   * Enhanced stream capture that works around CORS restrictions
   * Uses network monitoring and URL pattern analysis
   */
  static async captureStreamsFromEmbed(embedUrl: string): Promise<StreamSource[]> {
    console.log('🎯 Starting enhanced stream capture for:', embedUrl);
    
    // Clear previous captures
    this.capturedUrls.clear();
    this.streamSources = [];
    
    return new Promise((resolve) => {
      // Create monitoring iframe
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
      
      // Set up network monitoring before adding iframe
      this.setupNetworkMonitoring();
      
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupMonitoring();
          document.body.removeChild(iframe);
          
          console.log(`🎯 Stream capture completed. Found ${this.streamSources.length} streams`);
          resolve([...this.streamSources]);
        }
      }, 30000); // 30 second timeout
      
      iframe.onload = () => {
        console.log('📺 Embed iframe loaded, monitoring for streams...');
        
        // Even if we can't inject due to CORS, monitor for network requests
        setTimeout(() => {
          // Try to detect streams through various methods
          this.detectStreamsByPatterns();
          this.monitorDOMChanges(iframe);
        }, 2000);
        
        // Final check after extended time
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.cleanupMonitoring();
            document.body.removeChild(iframe);
            
            console.log(`🎯 Stream capture completed. Found ${this.streamSources.length} streams`);
            resolve([...this.streamSources]);
          }
        }, 25000);
      };
      
      iframe.onerror = () => {
        console.log('❌ Iframe failed to load');
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.cleanupMonitoring();
          document.body.removeChild(iframe);
          resolve([]);
        }
      };
      
      document.body.appendChild(iframe);
    });
  }
  
  /**
   * Set up network monitoring to catch stream requests
   */
  private static setupNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    (window as any)._originalFetch = originalFetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      this.analyzeUrl(url, 'fetch');
      return originalFetch.call(window, input, init);
    };
    
    // Monitor XHR requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    (window as any)._originalXHROpen = originalXHROpen;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      const urlString = typeof url === 'string' ? url : url.toString();
      StreamCapture.analyzeUrl(urlString, 'xhr');
      return originalXHROpen.call(this, method, url, async, username, password);
    };
    
    console.log('🌐 Network monitoring activated');
  }
  
  /**
   * Clean up network monitoring
   */
  private static cleanupMonitoring() {
    if ((window as any)._originalFetch) {
      window.fetch = (window as any)._originalFetch;
      delete (window as any)._originalFetch;
    }
    
    if ((window as any)._originalXHROpen) {
      XMLHttpRequest.prototype.open = (window as any)._originalXHROpen;
      delete (window as any)._originalXHROpen;
    }
    
    console.log('🌐 Network monitoring deactivated');
  }
  
  /**
   * Analyze URL to determine if it's a stream
   */
  private static analyzeUrl(url: string, source: string) {
    if (!url || this.capturedUrls.has(url)) return;
    
    // Skip common non-stream URLs
    if (url.includes('css') || url.includes('js') || url.includes('font') || 
        url.includes('png') || url.includes('jpg') || url.includes('svg') ||
        url.includes('favicon') || url.includes('analytics') || url.includes('ads') ||
        url.includes('google') || url.includes('facebook') || url.includes('twitter')) {
      return;
    }
    
    let streamType: 'hls' | 'mp4' | 'dash' | 'unknown' | null = null;
    let quality: string | undefined;
    
    // Detect stream types
    if (url.includes('.m3u8') || url.includes('m3u8')) {
      streamType = 'hls';
      quality = this.extractQualityFromUrl(url);
    } else if (url.includes('.mp4') || url.includes('mp4')) {
      streamType = 'mp4';
      quality = this.extractQualityFromUrl(url);
    } else if (url.includes('.mpd') || url.includes('dash')) {
      streamType = 'dash';
      quality = this.extractQualityFromUrl(url);
    } else if (url.includes('stream') || url.includes('video') || url.includes('media') ||
               url.includes('player') || url.includes('embed')) {
      // Potential stream URL
      if (url.includes('2embed') || url.includes('streamingnow') || 
          url.includes('multiembed') || url.includes('vidplay') ||
          url.includes('filemoon') || url.includes('streamwish')) {
        streamType = 'unknown';
      }
    }
    
    if (streamType) {
      this.capturedUrls.add(url);
      const streamSource: StreamSource = {
        url,
        type: streamType,
        quality: quality || 'auto'
      };
      
      this.streamSources.push(streamSource);
      console.log(`🎯 Stream captured [${source}]:`, streamSource);
    }
  }
  
  /**
   * Extract quality information from URL
   */
  private static extractQualityFromUrl(url: string): string {
    const qualityPatterns = [
      /(\d{3,4}p)/i,  // 720p, 1080p, etc.
      /(\d{3,4})x(\d{3,4})/i,  // 1920x1080
      /(low|medium|high|hd|fhd|uhd)/i
    ];
    
    for (const pattern of qualityPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return 'auto';
  }
  
  /**
   * Detect streams by analyzing page patterns
   */
  private static detectStreamsByPatterns() {
    // Check for common streaming service patterns in current page
    const pageContent = document.documentElement.innerHTML;
    
    // Look for embedded stream URLs in page content
    const urlPatterns = [
      /https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+\.webm[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+\.mpd[^\s"'<>]*/gi
    ];
    
    urlPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pageContent)) !== null) {
        this.analyzeUrl(match[0], 'page-content');
      }
    });
  }
  
  /**
   * Monitor DOM changes in iframe (if accessible)
   */
  private static monitorDOMChanges(iframe: HTMLIFrameElement) {
    try {
      // Try to access iframe content (may fail due to CORS)
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        console.log('📺 Iframe content accessible, monitoring DOM changes');
        
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  
                  // Check for video elements
                  if (element.tagName === 'VIDEO') {
                    const video = element as HTMLVideoElement;
                    if (video.src) this.analyzeUrl(video.src, 'video-element');
                    if (video.currentSrc) this.analyzeUrl(video.currentSrc, 'video-current');
                  }
                  
                  // Check for source elements
                  element.querySelectorAll('video, source').forEach((mediaEl) => {
                    const src = (mediaEl as HTMLMediaElement).src;
                    if (src) this.analyzeUrl(src, 'media-source');
                  });
                }
              });
            }
          });
        });
        
        observer.observe(iframeDoc.body, {
          childList: true,
          subtree: true
        });
        
        // Stop observing after 20 seconds
        setTimeout(() => observer.disconnect(), 20000);
      }
    } catch (error) {
      console.log('⚠️ Cannot access iframe content due to CORS restrictions');
    }
  }
  
  /**
   * Sort streams by preference
   */
  static sortStreamsByPreference(streams: StreamSource[]): StreamSource[] {
    return streams.sort((a, b) => {
      // Priority: HLS > MP4 > DASH > Unknown
      const getTypePriority = (type: string) => {
        switch (type) {
          case 'hls': return 4;
          case 'mp4': return 3;
          case 'dash': return 2;
          default: return 1;
        }
      };
      
      const typeDiff = getTypePriority(b.type) - getTypePriority(a.type);
      if (typeDiff !== 0) return typeDiff;
      
      // Secondary sort by quality
      const getQualityPriority = (quality?: string) => {
        if (!quality) return 0;
        if (quality.includes('1080') || quality.includes('fhd')) return 4;
        if (quality.includes('720') || quality.includes('hd')) return 3;
        if (quality.includes('480')) return 2;
        return 1;
      };
      
      return getQualityPriority(b.quality) - getQualityPriority(a.quality);
    });
  }
} 