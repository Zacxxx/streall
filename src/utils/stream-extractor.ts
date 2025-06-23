export interface StreamSource {
  url: string;
  type: 'hls' | 'mp4' | 'webm' | 'dash' | 'unknown';
  quality?: string;
  label?: string;
  headers?: Record<string, string>;
}

export interface ExtractedStreams {
  sources: StreamSource[];
  subtitle?: string;
  poster?: string;
  title?: string;
}

export class StreamExtractor {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Enhanced extraction for 2embed.cc service that handles 2embed.skin redirects
   */
  static async extractFrom2Embed(embedUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🔍 Extracting from 2Embed.cc:', embedUrl);

      // Step 1: Follow the initial redirect from 2embed.cc to 2embed.skin
      const skinUrl = await this.follow2EmbedRedirect(embedUrl);
      if (!skinUrl) {
        console.log('❌ Failed to get 2embed.skin redirect');
        return null;
      }

      console.log('🔗 Following redirect to:', skinUrl);

      // Step 2: Extract from the 2embed.skin page
      const skinStreams = await this.extractFrom2EmbedSkin(skinUrl);
      if (skinStreams && skinStreams.sources.length > 0) {
        return skinStreams;
      }

      // Step 3: Fallback to iframe detection and extraction
      console.log('🔄 Fallback: Using iframe extraction method...');
      return await this.extractViaDynamicIframes(embedUrl);

    } catch (error) {
      console.error('❌ Error extracting from 2Embed.cc:', error);
      return null;
    }
  }

  /**
   * Follow the redirect from 2embed.cc to 2embed.skin
   */
  private static async follow2EmbedRedirect(embedUrl: string): Promise<string | null> {
    try {
      const response = await fetch(embedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': 'https://www.2embed.cc/',
        },
        redirect: 'follow'
      });

      // Check if we were redirected to 2embed.skin
      const finalUrl = response.url;
      if (finalUrl.includes('2embed.skin')) {
        return finalUrl;
      }

      // If no automatic redirect, check the response for redirect URLs
      const html = await response.text();
      const redirectPatterns = [
        /window\.location\.href\s*=\s*["']([^"']*2embed\.skin[^"']*)["']/gi,
        /location\.href\s*=\s*["']([^"']*2embed\.skin[^"']*)["']/gi,
        /href\s*=\s*["']([^"']*2embed\.skin[^"']*movie\/\d+[^"']*)["']/gi,
      ];

      for (const pattern of redirectPatterns) {
        const matches = Array.from(html.matchAll(pattern));
        for (const match of matches) {
          const url = match[1];
          if (url && url.includes('2embed.skin')) {
            return url.startsWith('http') ? url : `https:${url}`;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error following 2embed redirect:', error);
      return null;
    }
  }

  /**
   * Extract streams from 2embed.skin page
   */
  private static async extractFrom2EmbedSkin(skinUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🎯 Extracting from 2embed.skin:', skinUrl);

      const response = await fetch(skinUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': 'https://www.2embed.cc/',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('📄 2embed.skin page fetched');

      const sources: StreamSource[] = [];

      // Look for iframe sources that contain actual video players
      const iframePatterns = [
        /<iframe[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
        /source\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
        /source\s*:\s*["']([^"']*\.mp4[^"']*)["']/gi,
        /file\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
        /file\s*:\s*["']([^"']*\.mp4[^"']*)["']/gi,
      ];

      let foundIframes = false;
      for (const pattern of iframePatterns) {
        const matches = Array.from(html.matchAll(pattern));
        for (const match of matches) {
          const url = match[1];
          if (url && this.isValidStreamUrl(url)) {
            foundIframes = true;
            console.log('🎬 Found potential iframe/stream:', url);

            if (url.includes('.m3u8')) {
              sources.push({
                url,
                type: 'hls',
                quality: 'auto',
                label: 'HLS Stream'
              });
            } else if (url.includes('.mp4')) {
              sources.push({
                url,
                type: 'mp4',
                quality: 'auto',
                label: 'MP4 Stream'
              });
            } else if (url.startsWith('http') && !url.includes('2embed')) {
              // This might be an iframe containing a video player
              const iframeStreams = await this.extractFromNestedIframe(url, skinUrl);
              if (iframeStreams) {
                sources.push(...iframeStreams.sources);
              }
            }
          }
        }
      }

      // Look for encoded or obfuscated stream URLs
      const encodedPatterns = [
        /atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/gi,
        /base64\s*:\s*["']([A-Za-z0-9+/=]+)["']/gi,
      ];

      for (const pattern of encodedPatterns) {
        const matches = Array.from(html.matchAll(pattern));
        for (const match of matches) {
          try {
            const decoded = atob(match[1]);
            if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
              console.log('🔓 Decoded stream URL:', decoded);
              sources.push({
                url: decoded,
                type: decoded.includes('.m3u8') ? 'hls' : 'mp4',
                quality: 'auto',
                label: 'Decoded Stream'
              });
            }
          } catch (e) {
            // Invalid base64, ignore
          }
        }
      }

      if (sources.length > 0) {
        const sortedSources = this.sortSourcesByPreference(sources);
        return {
          sources: sortedSources,
          title: this.extractTitle(html)
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting from 2embed.skin:', error);
      return null;
    }
  }

  /**
   * Extract streams using dynamic iframe detection
   */
  private static async extractViaDynamicIframes(embedUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🎬 Using dynamic iframe extraction for:', embedUrl);

      // This would ideally use browser automation, but for now we'll simulate
      // the iframe detection based on common patterns in 2embed.cc
      
      const sources: StreamSource[] = [];
      
      // Extract TMDB ID from the URL
      const tmdbMatch = embedUrl.match(/\/(\d+)$/);
      if (!tmdbMatch) return null;
      
      const tmdbId = tmdbMatch[1];
      
      // Generate potential streaming URLs based on common patterns
      const potentialUrls = [
        `https://streamsrcs.2embed.cc/hnszpnmex8h4?embed=1&referer=2embed.cc&adb=1&hls4=1`,
        `https://streamsrcs.2embed.cc/swish?id=hnszpnmex8h4&ref=https://www.2embed.cc/`,
        `https://vsrc.2embed.cc/movie/${tmdbId}`,
        `https://play.2embed.cc/movie/${tmdbId}`,
      ];

      for (const url of potentialUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': this.USER_AGENT,
              'Referer': 'https://www.2embed.cc/',
            }
          });

          if (response.ok) {
            const content = await response.text();
            const extractedSources = this.extractDirectStreamUrls(content);
            if (extractedSources && extractedSources.sources.length > 0) {
              sources.push(...extractedSources.sources);
            }
          }
        } catch (e) {
          // Continue to next URL
        }
      }

      if (sources.length > 0) {
        return {
          sources: this.removeDuplicateSources(sources),
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error in dynamic iframe extraction:', error);
      return null;
    }
  }

  /**
   * Extract from a nested iframe
   */
  private static async extractFromNestedIframe(iframeUrl: string, refererUrl: string): Promise<ExtractedStreams | null> {
    try {
      const response = await fetch(iframeUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': refererUrl,
        }
      });

      if (!response.ok) return null;

      const html = await response.text();
      return this.extractDirectStreamUrls(html);
    } catch (error) {
      console.log('❌ Error extracting from nested iframe:', error);
      return null;
    }
  }

  /**
   * Check if a URL is a valid stream URL
   */
  private static isValidStreamUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    // Skip common non-stream URLs
    const skipPatterns = [
      'javascript:',
      'data:',
      '.css',
      '.js',
      '.png',
      '.jpg',
      '.svg',
      '.ico',
      'whos.amung.us',
      'google',
      'facebook',
      'twitter'
    ];
    
    for (const pattern of skipPatterns) {
      if (url.includes(pattern)) return false;
    }
    
    // Accept URLs that could contain streams
    return url.startsWith('http') && (
      url.includes('stream') ||
      url.includes('play') ||
      url.includes('video') ||
      url.includes('embed') ||
      url.includes('.m3u8') ||
      url.includes('.mp4') ||
      url.includes('vsrc') ||
      url.length > 30 // Longer URLs are more likely to be streaming endpoints
    );
  }

  /**
   * Extract direct streaming URLs from HTML content
   */
  static extractDirectStreamUrls(html: string): ExtractedStreams | null {
    const sources: StreamSource[] = [];

    // Enhanced patterns for 2embed.cc/2embed.skin
    const streamPatterns = [
      // HLS streams
      /(?:source|file|src|url)\s*:\s*["']([^"']*\.m3u8[^"']*)["']/gi,
      /["']([^"']*\.m3u8[^"']*)["']/g,
      
      // MP4 streams
      /(?:source|file|src|url)\s*:\s*["']([^"']*\.mp4[^"']*)["']/gi,
      /["']([^"']*\.mp4[^"']*)["']/g,
      
      // WebM streams
      /(?:source|file|src|url)\s*:\s*["']([^"']*\.webm[^"']*)["']/gi,
      
      // Streaming service URLs
      /https?:\/\/[^"'\s]*(?:stream|play|video|vsrc)[^"'\s]*(?:\.m3u8|\.mp4)?/gi,
    ];

    for (const pattern of streamPatterns) {
      const matches = Array.from(html.matchAll(pattern));
      for (const match of matches) {
        const url = match[1] || match[0];
        if (url && this.isValidStreamUrl(url)) {
          sources.push({
            url: url.trim(),
            type: this.detectStreamType(url),
            quality: 'auto',
            label: 'Detected Stream'
          });
        }
      }
    }

    // Look for JSON data with stream information
    const jsonMatches = html.match(/(?:sources|streams?)\s*:\s*(\[.*?\])/gs);
    if (jsonMatches) {
      for (const jsonMatch of jsonMatches) {
        try {
          const jsonStr = jsonMatch.match(/\[.*\]/s)?.[0];
          if (jsonStr) {
            const streamData = JSON.parse(jsonStr);
            if (Array.isArray(streamData)) {
              streamData.forEach((stream: any) => {
                if (stream.file || stream.src || stream.url) {
                  const streamUrl = stream.file || stream.src || stream.url;
                  sources.push({
                    url: streamUrl,
                    type: this.detectStreamType(streamUrl),
                    quality: stream.label || stream.quality || 'auto',
                    label: stream.label || 'JSON Stream'
                  });
                }
              });
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }

    if (sources.length === 0) return null;

    return {
      sources: this.removeDuplicateSources(sources),
      title: this.extractTitle(html)
    };
  }

  /**
   * Extract streams from iframe content - crucial for nested video players
   */
  static async extractFromIframe(iframeUrl: string, refererUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🎬 Extracting from iframe:', iframeUrl);

      const response = await fetch(iframeUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': refererUrl,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('📄 Iframe content fetched');

      // Look for nested iframes first
      const iframePattern = /<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi;
      const iframeMatches = Array.from(html.matchAll(iframePattern));
      
      for (const match of iframeMatches) {
        let nestedUrl = match[1];
        
        // Handle relative URLs
        if (nestedUrl.startsWith('//')) {
          nestedUrl = 'https:' + nestedUrl;
        } else if (nestedUrl.startsWith('/')) {
          const urlObj = new URL(iframeUrl);
          nestedUrl = `${urlObj.protocol}//${urlObj.host}${nestedUrl}`;
        }
        
        console.log('🔗 Found nested iframe:', nestedUrl);
        
        // Recursively extract from nested iframe
        const nestedResults = await this.extractFromIframe(nestedUrl, iframeUrl);
        if (nestedResults && nestedResults.sources.length > 0) {
          return nestedResults;
        }
      }

      // If no nested iframes with results, extract direct streams
      return this.extractDirectStreamUrls(html);
    } catch (error) {
      console.error('❌ Error extracting from iframe:', error);
      return null;
    }
  }

  /**
   * Main extraction method that chooses the best approach
   */
  static async extractStreamsFromUrl(url: string): Promise<ExtractedStreams | null> {
    console.log('🎬 Starting stream extraction from:', url);

    // Clean the URL
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Choose extraction method based on the service
    if (cleanUrl.includes('2embed.cc')) {
      return await this.extractFrom2Embed(url);
    } else if (cleanUrl.includes('2embed.skin')) {
      return await this.extractFrom2EmbedSkin(url);
    } else {
      // Generic extraction for other services
      return await this.extractFromIframe(url, '');
    }
  }

  /**
   * Detect stream type from URL
   */
  static detectStreamType(url: string): StreamSource['type'] {
    if (url.includes('.m3u8')) return 'hls';
    if (url.includes('.mp4')) return 'mp4';
    if (url.includes('.webm')) return 'webm';
    if (url.includes('.mpd')) return 'dash';
    return 'unknown';
  }

  /**
   * Extract title from HTML
   */
  static extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    return undefined;
  }

  /**
   * Remove duplicate sources
   */
  static removeDuplicateSources(sources: StreamSource[]): StreamSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      const key = `${source.url}-${source.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort sources by preference (HLS > MP4 > WebM > Others)
   */
  static sortSourcesByPreference(sources: StreamSource[]): StreamSource[] {
    const typeOrder: Record<string, number> = {
      'hls': 1,
      'mp4': 2,
      'webm': 3,
      'dash': 4,
      'unknown': 5
    };

    return sources.sort((a, b) => {
      return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
    });
  }
} 