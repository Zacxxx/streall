export interface CapturedStream {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
  quality?: string;
  headers?: Record<string, string>;
}

export class StreamInjector {
  /**
   * Enhanced JavaScript code to inject into streaming pages to capture video URLs
   * Specifically designed for 2embed.cc and similar services
   */
  static getInjectionScript(): string {
    return `
(function() {
  console.log('🎬 Enhanced Stream Injector for 2embed.cc activated');
  
  // Store captured streams with more metadata
  window.capturedStreams = [];
  
  // Helper function to add stream
  function addStream(url, source, quality) {
    if (!url || typeof url !== 'string' || url.length < 10) return;
    
    // Skip non-stream URLs but be less restrictive
    if (url.includes('css') || url.includes('js') || url.includes('font') || 
        url.includes('png') || url.includes('jpg') || url.includes('svg') ||
        url.includes('favicon') || url.includes('analytics') || url.includes('ads')) return;
        
    // Detect stream type more aggressively
    const streamType = url.includes('.m3u8') || url.includes('m3u8') ? 'hls' : 
                      url.includes('.mp4') || url.includes('mp4') ? 'mp4' : 
                      url.includes('.webm') || url.includes('webm') ? 'webm' :
                      url.includes('dash') || url.includes('.mpd') ? 'dash' : 
                      url.includes('stream') || url.includes('video') || url.includes('media') ? 'unknown' : null;
    
    // Only add if it looks like a stream
    if (streamType) {
      const stream = {
        url: url,
        type: streamType,
        source: source,
        quality: quality,
        timestamp: Date.now()
      };
      
      console.log('🎯 Stream captured:', stream);
      window.capturedStreams.push(stream);
    }
  }
  
  // Monitor dynamic iframe creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'iframe') {
      console.log('📺 Iframe created dynamically');
      
      // Monitor src changes
      const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src')?.set;
      if (originalSrcSetter) {
        Object.defineProperty(element, 'src', {
          get: function() { return this._src; },
          set: function(value) {
            console.log('🔗 Iframe src set:', value);
            this._src = value;
            originalSrcSetter.call(this, value);
            
            // If this is a player iframe, inject into it
            if (value && (value.includes('player') || value.includes('embed') || value.includes('stream'))) {
              setTimeout(() => this.injectIntoIframe(this), 1000);
            }
          }
        });
      }
      
      // Monitor onload
      element.addEventListener('load', function() {
        console.log('📺 Iframe loaded:', this.src);
        setTimeout(() => this.injectIntoIframe(this), 500);
      });
    }
    
    if (tagName.toLowerCase() === 'video') {
      console.log('📺 Video element created');
      
      // Override src setter
      const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src')?.set;
      if (originalSrcSetter) {
        Object.defineProperty(element, 'src', {
          get: function() { return this._src; },
          set: function(value) {
            console.log('🎯 Video src set:', value);
            addStream(value, 'video.src', null);
            this._src = value;
            originalSrcSetter.call(this, value);
          }
        });
      }
      
      // Monitor all video events
      ['loadstart', 'loadedmetadata', 'canplay', 'loadeddata', 'progress'].forEach(eventType => {
        element.addEventListener(eventType, function() {
          if (this.src) addStream(this.src, 'video.' + eventType, null);
          if (this.currentSrc) addStream(this.currentSrc, 'video.current.' + eventType, null);
        });
      });
    }
    
    return element;
  };
  
  // Enhanced JWPlayer detection and hooking
  function hookJWPlayer() {
    if (typeof jwplayer !== 'undefined') {
      console.log('🎬 JWPlayer detected, hooking setup');
      
      const originalJWPlayer = jwplayer;
      window.jwplayer = function(...args) {
        const instance = originalJWPlayer(...args);
        
        // Hook setup method
        if (instance && instance.setup) {
          const originalSetup = instance.setup;
          instance.setup = function(config) {
            console.log('🎬 JWPlayer setup config:', config);
            
            if (config.file) {
              addStream(config.file, 'jwplayer.config.file', config.label || config.quality);
            }
            
            if (config.sources && Array.isArray(config.sources)) {
              config.sources.forEach(source => {
                if (source.file) addStream(source.file, 'jwplayer.sources', source.label);
                if (source.src) addStream(source.src, 'jwplayer.sources', source.label);
              });
            }
            
            if (config.playlist && Array.isArray(config.playlist)) {
              config.playlist.forEach(item => {
                if (item.file) addStream(item.file, 'jwplayer.playlist', item.label);
                if (item.sources) {
                  item.sources.forEach(source => {
                    if (source.file) addStream(source.file, 'jwplayer.playlist.sources', source.label);
                  });
                }
              });
            }
            
            return originalSetup.call(this, config);
          };
        }
        
        return instance;
      };
      
      // Copy static methods
      Object.keys(originalJWPlayer).forEach(key => {
        if (typeof originalJWPlayer[key] === 'function') {
          window.jwplayer[key] = originalJWPlayer[key];
        }
      });
    }
  }
  
  // Hook Video.js if present
  function hookVideoJS() {
    if (typeof videojs !== 'undefined') {
      console.log('🎬 Video.js detected');
      // Add Video.js specific hooks here
    }
  }
  
  // Enhanced fetch monitoring - much more aggressive
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string') {
      console.log('🌐 Fetch request:', url);
      addStream(url, 'fetch', null);
    }
    return originalFetch.call(this, url, options);
  };
  
  // Enhanced XHR monitoring - much more aggressive
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      console.log('🌐 XHR request:', url);
      addStream(url, 'xhr', null);
    }
    return originalXHROpen.call(this, method, url);
  };
  
  // Monitor window messages (for iframe communication)
  window.addEventListener('message', function(event) {
    console.log('📨 Message received:', event.data);
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'video' || event.data.type === 'stream' || event.data.url) {
        console.log('📨 Stream message received:', event.data);
        if (event.data.url) addStream(event.data.url, 'message', null);
      }
    }
    // Also check if the message data contains any URLs
    const messageStr = JSON.stringify(event.data);
    const urlPattern = /https?:\/\/[^\s"'<>]+/g;
    let match;
    while ((match = urlPattern.exec(messageStr)) !== null) {
      addStream(match[0], 'message.url', null);
    }
  });
  
  // Monitor global variable assignments that might contain stream URLs
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (descriptor.value && typeof descriptor.value === 'string' && descriptor.value.startsWith('http')) {
      console.log('🔧 Property defined:', prop, descriptor.value);
      addStream(descriptor.value, 'property.' + prop, null);
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  // Periodic check for new players
  let checkCount = 0;
  const playerCheck = setInterval(() => {
    checkCount++;
    
    hookJWPlayer();
    hookVideoJS();
    
    // Look for video elements that might have been added
    document.querySelectorAll('video').forEach(video => {
      if (video.src && !video._streamInjected) {
        addStream(video.src, 'periodic.video.src', null);
        video._streamInjected = true;
      }
      if (video.currentSrc && !video._currentStreamInjected) {
        addStream(video.currentSrc, 'periodic.video.currentSrc', null);
        video._currentStreamInjected = true;
      }
    });
    
    // Also check for any URLs in the page content that might be streams
    const pageText = document.documentElement.innerHTML;
    const urlPattern = /https?:\/\/[^\s"'<>]+\.(m3u8|mp4|webm|mpd)/gi;
    let match;
    while ((match = urlPattern.exec(pageText)) !== null) {
      addStream(match[0], 'page.content', null);
    }
    
    // Look for iframes that might contain players
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.src && !iframe._injected && 
          (iframe.src.includes('player') || iframe.src.includes('embed') || iframe.src.includes('stream'))) {
        console.log('📺 Found player iframe:', iframe.src);
        iframe._injected = true;
      }
    });
    
    // Stop after 60 checks (30 seconds with 500ms intervals)
    if (checkCount >= 60) {
      clearInterval(playerCheck);
      console.log('🏁 Stream monitoring completed');
    }
  }, 500);
  
  // Utility function to get captured streams
  window.getCapturedStreams = function() {
    // Remove duplicates
    const unique = [];
    const seen = new Set();
    
    window.capturedStreams.forEach(stream => {
      if (!seen.has(stream.url)) {
        seen.add(stream.url);
        unique.push(stream);
      }
    });
    
    // Sort by timestamp (newest first) and prefer certain types
    return unique.sort((a, b) => {
      // Prefer HLS and MP4 streams
      const aScore = a.type === 'hls' ? 3 : a.type === 'mp4' ? 2 : 1;
      const bScore = b.type === 'hls' ? 3 : b.type === 'mp4' ? 2 : 1;
      
      if (aScore !== bScore) return bScore - aScore;
      return b.timestamp - a.timestamp;
    });
  };
  
  console.log('🎬 Enhanced stream injector ready. Use window.getCapturedStreams() to get streams.');
  
  // Initial hooks
  hookJWPlayer();
  hookVideoJS();
})();
`;
  }

  /**
   * Extract streams using iframe with enhanced JavaScript injection
   * Handles 2embed.cc redirects and dynamic loading
   */
  static async extractStreamsWithInjection(embedUrl: string): Promise<CapturedStream[]> {
    return new Promise((resolve) => {
      // Create iframe to load the streaming page
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      
      // Set proper attributes for 2embed.cc compatibility
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('webkitAllowFullScreen', 'true');
      iframe.setAttribute('mozallowfullscreen', 'true');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('frameborder', '0');
      
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
      
      let resolved = false;
      let injectionAttempts = 0;
      
      // Extended timeout for 2embed.cc's redirect chain
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(iframe);
          resolve([]);
        }
      }, 35000); // 35 second timeout for complex loading
      
              const attemptInjection = () => {
          try {
            injectionAttempts++;
            console.log(`🎬 Stream injection attempt ${injectionAttempts}`);
            
            // Check if iframe is accessible
            if (!iframe.contentDocument || !iframe.contentWindow) {
              console.log('⚠️ Iframe not accessible due to CORS, trying alternative approach...');
              
              // Try to get the final URL after redirects
              const finalUrl = iframe.contentWindow?.location?.href || iframe.src;
              console.log(`📍 Iframe final URL: ${finalUrl}`);
              
              if (injectionAttempts < 10) {
                setTimeout(attemptInjection, 2000);
              }
              return;
            }
          
          // Inject our enhanced stream capture script
          const script = iframe.contentDocument.createElement('script');
          script.textContent = this.getInjectionScript();
          iframe.contentDocument.head.appendChild(script);
          
          console.log('🎬 Enhanced stream capture script injected');
          
          // Wait longer for 2embed.cc's complex loading process
          setTimeout(() => {
            try {
              const capturedStreams = (iframe.contentWindow as any)?.getCapturedStreams?.() || [];
              console.log('🎯 Captured streams:', capturedStreams);
              
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                
                // Convert to our format
                const streams: CapturedStream[] = capturedStreams.map((stream: any) => ({
                  url: stream.url,
                  type: stream.type,
                  quality: stream.quality,
                }));
                
                resolve(streams);
              }
            } catch (error) {
              console.error('Error getting captured streams:', error);
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                resolve([]);
              }
            }
          }, 20000); // Wait 20 seconds for streams to load
          
        } catch (error) {
          console.error('Error injecting script:', error);
          if (injectionAttempts < 5) {
            setTimeout(attemptInjection, 3000);
          } else if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            resolve([]);
          }
        }
      };
      
      iframe.onload = () => {
        console.log('📺 Iframe loaded, attempting injection...');
        // Wait a bit for redirects to complete
        setTimeout(attemptInjection, 2000);
      };
      
      iframe.onerror = () => {
        console.error('❌ Iframe failed to load');
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(iframe);
          resolve([]);
        }
      };
      
      // Set iframe source and add to page
      iframe.src = embedUrl;
      document.body.appendChild(iframe);
    });
  }
} 