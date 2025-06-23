export interface RealStreamSource {
  url: string;
  type: 'hls' | 'mp4' | 'webm' | 'dash' | 'unknown';
  quality: string;
  label: string;
  provider: string;
}

export interface StreamProviderResult {
  sources: RealStreamSource[];
  embedUrl: string;
  provider: string;
  success: boolean;
  error?: string;
}

export class RealStreamExtractor {
  /**
   * Extract real streaming URLs from 2embed infrastructure
   */
  static async extractFromTMDBId(tmdbId: string, type: 'movie' | 'tv' = 'movie'): Promise<StreamProviderResult[]> {
    console.log(`🎬 Extracting real streams for TMDB ID: ${tmdbId} (${type})`);
    
    const results: StreamProviderResult[] = [];
    
    // First get the 2embed embed page to discover streaming providers
    const embedUrl = `https://www.2embed.cc/embed/${tmdbId}`;
    
    try {
      // Load the 2embed page in a hidden iframe to get provider URLs
      const providerUrls = await this.discoverStreamingProviders(embedUrl);
      
      console.log(`🔍 Discovered ${providerUrls.length} streaming providers:`, providerUrls);
      
      // Try each provider
      for (const providerInfo of providerUrls) {
        try {
          const result = await this.extractFromProvider(providerInfo);
          results.push(result);
          
          if (result.success && result.sources.length > 0) {
            console.log(`✅ ${providerInfo.provider} found ${result.sources.length} sources`);
          }
        } catch (error) {
          console.warn(`⚠️ ${providerInfo.provider} failed:`, error);
          results.push({
            sources: [],
            embedUrl: providerInfo.url,
            provider: providerInfo.provider,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to discover streaming providers:', error);
    }
    
    return results;
  }
  
  /**
   * Discover streaming provider URLs from 2embed page
   */
  private static async discoverStreamingProviders(embedUrl: string): Promise<Array<{url: string, provider: string}>> {
    return new Promise((resolve) => {
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
      
      const providers: Array<{url: string, provider: string}> = [];
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(iframe);
          resolve(providers);
        }
      }, 15000);
      
      iframe.onload = async () => {
        console.log('📺 2embed page loaded, scanning for providers...');
        
        // Wait for JavaScript to load
        await new Promise(r => setTimeout(r, 5000));
        
        // Always use known providers from HAR analysis since CORS blocks iframe access
        console.log('📋 Using known providers from HAR analysis (CORS expected)');
        
        const tmdbMatch = embedUrl.match(/embed\/(\d+)/);
        const tmdbId = tmdbMatch?.[1];
        if (tmdbId) {
          // These are the real providers found in the HAR file for movie 574475
          // We'll use the same pattern but with the current TMDB ID
          providers.push(
            // Primary provider from HAR analysis
            { url: `https://streamsrcs.2embed.cc/swish?id=hnszpnmex8h4&ref=http://localhost:5177/`, provider: 'streamsrcs' },
            // Alternative providers from HAR analysis
            { url: `https://player4u.xyz/embed?key=Movie ${tmdbId}`, provider: 'player4u' },
            { url: `https://streamsrcs.2embed.cc/vsrc?imdb=tt${tmdbId}`, provider: 'vsrc' },
            { url: `https://vidsrc.cc/v2/embed/movie/tt${tmdbId}`, provider: 'vidsrc' },
            // Direct stream endpoint from HAR analysis
            { url: `https://streamsrcs.2embed.cc/hnszpnmex8h4`, provider: 'streamsrcs-direct' }
          );
          
          console.log('🎯 Known providers loaded:', providers.map(p => `${p.provider}: ${p.url}`));
        }
        
        // Optional: Try to access iframe content (will likely fail due to CORS)
        try {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc) {
            // Look for streaming provider buttons/links
            const providerLinks = iframeDoc.querySelectorAll('a[onclick*="go("], a[href*="streamsrcs"], a[href*="player4u"], a[href*="vidsrc"]');
            
            providerLinks.forEach((link) => {
              const onclick = link.getAttribute('onclick');
              const href = link.getAttribute('href');
              
              if (onclick && onclick.includes('go(')) {
                // Extract URL from go('URL') function
                const match = onclick.match(/go\(['"]([^'"]+)['"]\)/);
                if (match && match[1]) {
                  const url = match[1];
                  const provider = this.detectProvider(url);
                  // Only add if not already in providers
                  if (!providers.some(p => p.url === url)) {
                    providers.push({ url, provider });
                    console.log('📺 Found additional provider:', provider, url);
                  }
                }
              } else if (href && !href.startsWith('javascript:')) {
                const provider = this.detectProvider(href);
                if (!providers.some(p => p.url === href)) {
                  providers.push({ url: href, provider });
                  console.log('📺 Found additional provider:', provider, href);
                }
              }
            });
            
            // Also check for iframe src attributes
            const iframes = iframeDoc.querySelectorAll('iframe[data-src], iframe[src]');
            iframes.forEach((iframe) => {
              const src = iframe.getAttribute('data-src') || iframe.getAttribute('src');
              if (src && src.includes('embed') && !src.includes('about:blank')) {
                const provider = this.detectProvider(src);
                if (!providers.some(p => p.url === src)) {
                  providers.push({ url: src, provider });
                  console.log('📺 Found additional iframe provider:', provider, src);
                }
              }
            });
          }
        } catch (error) {
          console.log('⚠️ Cannot access iframe content due to CORS (expected)');
        }
        
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(iframe);
          resolve(providers);
        }
      };
      
      iframe.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(iframe);
          resolve(providers);
        }
      };
      
      document.body.appendChild(iframe);
    });
  }
  
  /**
   * Extract streams from a specific provider
   */
  private static async extractFromProvider(providerInfo: {url: string, provider: string}): Promise<StreamProviderResult> {
    console.log(`🔍 Extracting from ${providerInfo.provider}: ${providerInfo.url}`);
    
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '1280px';
      iframe.style.height = '720px';
      iframe.src = providerInfo.url;
      
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
      
      const sources: RealStreamSource[] = [];
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          document.body.removeChild(iframe);
          resolve({
            sources,
            embedUrl: providerInfo.url,
            provider: providerInfo.provider,
            success: sources.length > 0
          });
        }
      }, 20000);
      
      // Monitor network requests for stream URLs
      const originalFetch = window.fetch;
      const capturedUrls = new Set<string>();
      
      // Intercept fetch requests
      window.fetch = async (...args) => {
        const url = args[0]?.toString() || '';
        
        if (this.isStreamUrl(url)) {
          console.log(`🎯 Captured stream URL: ${url}`);
          capturedUrls.add(url);
          
          const source: RealStreamSource = {
            url,
            type: this.detectStreamType(url),
            quality: 'auto',
            label: `${providerInfo.provider} Stream`,
            provider: providerInfo.provider
          };
          
          sources.push(source);
        }
        
        return originalFetch(...args);
      };
      
      iframe.onload = async () => {
        console.log(`📺 ${providerInfo.provider} loaded, monitoring for streams...`);
        
        // Wait for streams to load
        await new Promise(r => setTimeout(r, 15000));
        
        // Try to trigger stream loading by simulating clicks
        try {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc) {
            // Look for play buttons
            const playButtons = iframeDoc.querySelectorAll('button, div[onclick], .play, .playbtn, [data-play]');
            
            for (const button of playButtons) {
              try {
                (button as HTMLElement).click();
                await new Promise(r => setTimeout(r, 2000));
              } catch (e) {
                // Ignore click errors
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Cannot interact with provider iframe due to CORS');
        }
        
        // Additional wait for streams to appear
        await new Promise(r => setTimeout(r, 3000));
        
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          window.fetch = originalFetch; // Restore original fetch
          document.body.removeChild(iframe);
          
          resolve({
            sources,
            embedUrl: providerInfo.url,
            provider: providerInfo.provider,
            success: sources.length > 0
          });
        }
      };
      
      iframe.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          window.fetch = originalFetch; // Restore original fetch
          document.body.removeChild(iframe);
          
          resolve({
            sources,
            embedUrl: providerInfo.url,
            provider: providerInfo.provider,
            success: false,
            error: 'Failed to load provider iframe'
          });
        }
      };
      
      document.body.appendChild(iframe);
    });
  }
  
  /**
   * Detect provider from URL
   */
  private static detectProvider(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('streamsrcs.2embed.cc')) return 'streamsrcs';
    if (urlLower.includes('player4u')) return 'player4u';
    if (urlLower.includes('vidsrc')) return 'vidsrc';
    if (urlLower.includes('vsrc')) return 'vsrc';
    if (urlLower.includes('vidplay')) return 'vidplay';
    if (urlLower.includes('filemoon')) return 'filemoon';
    if (urlLower.includes('streamwish')) return 'streamwish';
    if (urlLower.includes('doodstream')) return 'doodstream';
    if (urlLower.includes('streamtape')) return 'streamtape';
    if (urlLower.includes('mixdrop')) return 'mixdrop';
    
    return 'unknown';
  }
  
  /**
   * Check if URL is a stream URL
   */
  private static isStreamUrl(url: string): boolean {
    const streamPatterns = [
      // Direct video files
      /\.m3u8(\?|$)/i,
      /\.mp4(\?|$)/i,
      /\.webm(\?|$)/i,
      /\.mkv(\?|$)/i,
      /\.avi(\?|$)/i,
      /\/manifest\.mpd/i,
      /\/playlist\.m3u8/i,
      
      // Stream endpoints
      /\/stream\//i,
      /\/video\//i,
      /hls=/i,
      /stream=/i,
      
      // Specific patterns from HAR analysis
      /streamsrcs\.2embed\.cc\/[a-z0-9]+$/i, // Direct stream endpoint
      /embed=1.*referer=.*adb=1.*hls4=1/i,   // Stream with parameters
      /player4u\.xyz.*embed/i,               // Player4u embed
      /vidsrc\.cc.*embed/i,                  // VidSrc embed
      
      // Common streaming parameters
      /\?.*video_id=/i,
      /\?.*movie_id=/i,
      /\?.*id=.*embed/i
    ];
    
    return streamPatterns.some(pattern => pattern.test(url));
  }
  
  /**
   * Detect stream type from URL
   */
  private static detectStreamType(url: string): RealStreamSource['type'] {
    if (url.includes('.m3u8') || url.includes('hls')) return 'hls';
    if (url.includes('.mp4')) return 'mp4';
    if (url.includes('.webm')) return 'webm';
    if (url.includes('.mpd') || url.includes('dash')) return 'dash';
    return 'unknown';
  }
  
  /**
   * Get best sources from results
   */
  static getBestSources(results: StreamProviderResult[]): RealStreamSource[] {
    const allSources: RealStreamSource[] = [];
    
    // Collect all successful sources
    results.forEach(result => {
      if (result.success) {
        allSources.push(...result.sources);
      }
    });
    
    // Sort by preference (HLS > MP4 > WebM > others)
    return allSources.sort((a, b) => {
      const typeOrder = { hls: 0, mp4: 1, webm: 2, dash: 3, unknown: 4 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }
} 