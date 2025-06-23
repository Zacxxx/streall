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
   * Extract stream URLs from 2embed.cc service
   */
  static async extractFrom2Embed(embedUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🔍 Extracting from 2Embed:', embedUrl);

      // Fetch the embed page
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': 'https://www.2embed.cc/',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('📄 2Embed page fetched');

             // Look for redirect URL to actual streaming service
       const redirectPatterns = [
         /window\.location\.href\s*=\s*["']([^"']+)["']/g,
         /location\.href\s*=\s*["']([^"']+)["']/g,
         /window\.open\s*\(\s*["']([^"']+)["']/g,
         /<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["'][^;]*;\s*url\s*=\s*([^"']+)["']/gi,
         // Also look for streamingnow URLs directly in text
         /https?:\/\/streamingnow\.mov[^"'\s]*/gi,
       ];

       let foundRedirectUrl = null;
       for (const pattern of redirectPatterns) {
         const matches = Array.from(html.matchAll(pattern));
         for (const match of matches) {
           const redirectUrl = match[1] || match[0]; // Some patterns capture the full URL, others just the URL part
           if (redirectUrl && redirectUrl.startsWith('http') && redirectUrl.includes('streamingnow.mov')) {
             console.log('🔗 Found redirect URL:', redirectUrl);
             foundRedirectUrl = redirectUrl;
             break;
           }
         }
         if (foundRedirectUrl) break;
       }

       if (foundRedirectUrl) {
         return await this.extractFromStreamingNow(foundRedirectUrl);
       }

      // Fallback: look for direct streaming URLs in the HTML
      return this.extractDirectStreamUrls(html);
    } catch (error) {
      console.error('❌ Error extracting from 2Embed:', error);
      return null;
    }
  }

  /**
   * Extract stream URLs from streamingnow.mov service
   */
  static async extractFromStreamingNow(streamingUrl: string): Promise<ExtractedStreams | null> {
    try {
      console.log('🎯 Extracting from StreamingNow:', streamingUrl);

      const response = await fetch(streamingUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': 'https://multiembed.mov/',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('📄 StreamingNow page fetched');

      // Common patterns for streaming URLs in streamingnow.mov
      const sources: StreamSource[] = [];

      // Look for m3u8 HLS streams
      const hlsMatches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi);
      if (hlsMatches) {
        hlsMatches.forEach(url => {
          sources.push({
            url: url.trim(),
            type: 'hls',
            quality: 'auto',
            label: 'HLS Stream'
          });
        });
      }

      // Look for mp4 files
      const mp4Matches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi);
      if (mp4Matches) {
        mp4Matches.forEach(url => {
          sources.push({
            url: url.trim(),
            type: 'mp4',
            quality: 'unknown',
            label: 'MP4 Stream'
          });
        });
      }

             // Look for JSON data with stream information
       const jsonMatches = html.match(/(?:sources|stream)\s*:\s*(\[.*?\])/gs);
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
                       quality: stream.label || stream.quality || 'unknown',
                       label: stream.label || 'Stream'
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

       // Enhanced JWPlayer detection for streamingnow.mov
       console.log('🎬 Looking for JWPlayer configurations...');
       
       // Look for JWPlayer setup patterns (including minified)
       const jwPlayerPatterns = [
         // Standard JWPlayer setup
         /jwplayer\s*\([^)]*\)\.setup\s*\(\s*({[^}]+})/gi,
         /\.setup\s*\(\s*({[^}]+file[^}]+})/gi,
         
         // Minified variable assignments that might contain file URLs
         /[a-zA-Z_$][\w$]*\s*=\s*['"']([^'"]*(?:\.m3u8|\.mp4)[^'"]*)['"']/gi,
         
         // Base64 or encoded URLs (common in streaming sites)
         /['"]((?:aHR0cHM|aHR0cA)[A-Za-z0-9+/=]+)['"]/gi,
         
         // Look for file: assignments in any context
         /file\s*:\s*['"']([^'"]+)['"']/gi,
         
         // Look for obfuscated streaming URLs
         /['"](https?:\/\/[^'"]*(?:cdn|stream|video|media|play)[^'"]*\.[^'"]*)['"]/gi,
       ];

       jwPlayerPatterns.forEach(pattern => {
         const matches = Array.from(html.matchAll(pattern));
         matches.forEach(match => {
           let url = match[1];
           
           // Try to decode base64 URLs
           if (url && url.startsWith('aHR0c')) {
             try {
               url = atob(url);
               console.log('🔓 Decoded base64 URL:', url);
             } catch (e) {
               // Not valid base64
             }
           }
           
           if (url && url.startsWith('http') && 
               (url.includes('.m3u8') || url.includes('.mp4') || 
                url.includes('stream') || url.includes('video'))) {
             sources.push({
               url: url,
               type: this.detectStreamType(url),
               quality: 'auto',
               label: 'JWPlayer Stream'
             });
           }
         });
       });

       // Look for any obfuscated or split URLs
       const obfuscatedPatterns = [
         // URLs split across variables (common obfuscation)
         /var\s+[a-zA-Z_$][\w$]*\s*=\s*['"']([^'"]+)['"'].*?var\s+[a-zA-Z_$][\w$]*\s*=\s*['"']([^'"]+)['"']/gs,
         
         // Concatenated strings
         /['"']([^'"]*(?:https?|stream|video)[^'"]*)['"']\s*\+\s*['"']([^'"]*)['"']/gi,
       ];

       obfuscatedPatterns.forEach(pattern => {
         const matches = Array.from(html.matchAll(pattern));
         matches.forEach(match => {
           const combined = match[1] + (match[2] || '');
           if (combined && combined.startsWith('http') && 
               (combined.includes('.m3u8') || combined.includes('.mp4'))) {
             sources.push({
               url: combined,
               type: this.detectStreamType(combined),
               quality: 'auto',
               label: 'Obfuscated Stream'
             });
           }
         });
       });

      // Look for iframe sources - this is critical for streamingnow.mov!
      const iframeMatches = html.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi);
      if (iframeMatches) {
        console.log(`🔍 Found ${iframeMatches.length} iframes in StreamingNow`);
        
        for (const iframeMatch of iframeMatches) {
          const srcMatch = iframeMatch.match(/src\s*=\s*["']([^"']+)["']/i);
          if (srcMatch) {
            let iframeSrc = srcMatch[1];
            
            // Handle relative URLs
            if (iframeSrc && iframeSrc.startsWith('/')) {
              const baseUrl = new URL(streamingUrl);
              iframeSrc = `${baseUrl.protocol}//${baseUrl.host}${iframeSrc}`;
            } else if (iframeSrc && iframeSrc.startsWith('./')) {
              const baseUrl = new URL(streamingUrl);
              iframeSrc = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname}${iframeSrc.substring(2)}`;
            }
            
            console.log(`📺 Processing iframe: ${iframeSrc}`);
            
            // Extract from iframe content - this often contains the actual video player
            if (iframeSrc) {
              try {
                const iframeStreams = await this.extractFromIframe(iframeSrc, streamingUrl);
                if (iframeStreams && iframeStreams.sources.length > 0) {
                  console.log(`✅ Found ${iframeStreams.sources.length} streams in iframe`);
                  sources.push(...iframeStreams.sources);
                }
              } catch (error) {
                console.error(`❌ Error extracting from iframe ${iframeSrc}:`, error);
              }
            }
          }
        }
      }

      console.log(`🎯 Found ${sources.length} potential streams`);

      return sources.length > 0 ? {
        sources: this.removeDuplicateSources(sources),
        title: this.extractTitle(html)
      } : null;

    } catch (error) {
      console.error('❌ Error extracting from StreamingNow:', error);
      return null;
    }
  }

  /**
   * Extract direct streaming URLs from HTML content
   */
  static extractDirectStreamUrls(html: string): ExtractedStreams | null {
    const sources: StreamSource[] = [];

    // Comprehensive patterns for video URLs
    const patterns = [
      // HLS streams
      { regex: /https?:\/\/[^"'\s\)]+\.m3u8[^"'\s\)]*/gi, type: 'hls' as const },
      // MP4 files
      { regex: /https?:\/\/[^"'\s\)]+\.mp4[^"'\s\)]*/gi, type: 'mp4' as const },
      // WebM files
      { regex: /https?:\/\/[^"'\s\)]+\.webm[^"'\s\)]*/gi, type: 'webm' as const },
      // DASH streams
      { regex: /https?:\/\/[^"'\s\)]+\.mpd[^"'\s\)]*/gi, type: 'dash' as const },
      // Common streaming domains
      { regex: /https?:\/\/[^"'\s]*(?:stream|video|player|embed)[^"'\s]*/gi, type: 'unknown' as const },
    ];

         patterns.forEach(({ regex, type }) => {
       const matches = html.match(regex);
       if (matches) {
         matches.forEach(url => {
           const cleanUrl = url.replace(/['")\]]+$/, ''); // Remove trailing quotes/brackets
           
           // Skip embed service URLs as they're not actual video streams
           if (cleanUrl.includes('streamingnow.mov') || cleanUrl.includes('multiembed.mov') || cleanUrl.includes('2embed.cc')) {
             return;
           }
           
           if (cleanUrl.length > 10) { // Filter out very short URLs
             sources.push({
               url: cleanUrl,
               type,
               quality: 'auto',
               label: `${type.toUpperCase()} Stream`
             });
           }
         });
       }
     });

    console.log(`🔍 Found ${sources.length} direct stream URLs`);

    return sources.length > 0 ? {
      sources: this.removeDuplicateSources(sources),
      title: this.extractTitle(html)
    } : null;
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('📄 Iframe content fetched, length:', html.length);

      const sources: StreamSource[] = [];

      // Enhanced patterns for iframe content
      const patterns = [
        // Video.js style source configurations
        /sources?\s*:\s*\[([^\]]+)\]/gi,
        /source\s*:\s*['"']([^'"]+)['"']/gi,
        
        // JWPlayer configurations
        /file\s*:\s*['"']([^'"]+)['"']/gi,
        /playlist\s*:\s*\[([^\]]+)\]/gi,
        
        // HLS streams
        /['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/gi,
        
        // MP4 files
        /['"](https?:\/\/[^'"]*\.mp4[^'"]*)['"]/gi,
        
        // Common video hosting patterns
        /['"](https?:\/\/[^'"]*(?:googlevideo|googleapis|youtube|vimeo|dailymotion)[^'"]*)['"]/gi,
        
        // Blob URLs
        /['"](blob:https?:\/\/[^'"]+)['"]/gi,
        
        // Generic streaming URLs
        /['"](https?:\/\/[^'"]*(?:stream|video|media|play|watch)[^'"]*\.(m3u8|mp4|webm|flv|mkv)[^'"]*)['"]/gi,
        
        // Data URLs in JavaScript
        /(?:src|url|href)\s*=\s*['"']([^'"]*(?:stream|video|media)[^'"]*)['"']/gi,
      ];

      patterns.forEach(pattern => {
        const matches = Array.from(html.matchAll(pattern));
        matches.forEach(match => {
          const url = match[1];
          if (url && url.startsWith('http') && url.length > 10) {
            sources.push({
              url: url.trim(),
              type: this.detectStreamType(url),
              quality: 'auto',
              label: 'Iframe Stream'
            });
          }
        });
      });

      // Look for JavaScript variables containing stream data
      const jsVariablePatterns = [
        /(?:var|let|const)\s+\w*(?:source|stream|video|url)\w*\s*=\s*['"']([^'"]+)['"']/gi,
        /\w*(?:Source|Stream|Video|Url)\w*\s*:\s*['"']([^'"]+)['"']/gi,
      ];

      jsVariablePatterns.forEach(pattern => {
        const matches = Array.from(html.matchAll(pattern));
        matches.forEach(match => {
          const url = match[1];
          if (url && url.startsWith('http') && (url.includes('.m3u8') || url.includes('.mp4'))) {
            sources.push({
              url: url.trim(),
              type: this.detectStreamType(url),
              quality: 'auto',
              label: 'JS Variable Stream'
            });
          }
        });
      });

      // Look for nested iframes (sometimes there are multiple levels)
      const nestedIframeMatches = html.match(/<iframe[^>]+src\s*=\s*["']([^"']+)["']/gi);
      if (nestedIframeMatches && nestedIframeMatches.length > 0) {
        console.log(`🔄 Found ${nestedIframeMatches.length} nested iframes`);
        
        for (const nestedMatch of nestedIframeMatches.slice(0, 3)) { // Limit to prevent infinite loops
          const nestedSrcMatch = nestedMatch.match(/src\s*=\s*["']([^"']+)["']/i);
          if (nestedSrcMatch) {
            let nestedSrc = nestedSrcMatch[1];
            
            // Handle relative URLs for nested iframe
            if (nestedSrc && nestedSrc.startsWith('/')) {
              const baseUrl = new URL(iframeUrl);
              nestedSrc = `${baseUrl.protocol}//${baseUrl.host}${nestedSrc}`;
            }
            
            if (nestedSrc) {
              try {
                const nestedStreams = await this.extractFromIframe(nestedSrc, iframeUrl);
                if (nestedStreams && nestedStreams.sources.length > 0) {
                  sources.push(...nestedStreams.sources);
                }
              } catch (error) {
                console.error(`❌ Error extracting from nested iframe:`, error);
              }
            }
          }
        }
      }

      console.log(`🎯 Extracted ${sources.length} sources from iframe`);

      return sources.length > 0 ? {
        sources: this.removeDuplicateSources(sources),
        title: this.extractTitle(html)
      } : null;

    } catch (error) {
      console.error('❌ Error extracting from iframe:', error);
      return null;
    }
  }

  /**
   * Extract streams from any URL
   */
  static async extractStreamsFromUrl(url: string): Promise<ExtractedStreams | null> {
    try {
      if (url.includes('2embed.cc')) {
        return await this.extractFrom2Embed(url);
      } else if (url.includes('multiembed.mov')) {
        return await this.extractFrom2Embed(url); // Legacy support
      } else if (url.includes('streamingnow.mov')) {
        return await this.extractFromStreamingNow(url);
      } else {
        // Generic extraction
        const response = await fetch(url, {
          headers: { 'User-Agent': this.USER_AGENT }
        });
        const html = await response.text();
        return this.extractDirectStreamUrls(html);
      }
    } catch (error) {
      console.error('❌ Error extracting streams from URL:', error);
      return null;
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
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim();
  }

  /**
   * Remove duplicate sources
   */
  static removeDuplicateSources(sources: StreamSource[]): StreamSource[] {
    const seen = new Set<string>();
    return sources.filter(source => {
      if (seen.has(source.url)) {
        return false;
      }
      seen.add(source.url);
      return true;
    });
  }

  /**
   * Sort sources by preference (HLS > MP4 > WebM > Others)
   */
  static sortSourcesByPreference(sources: StreamSource[]): StreamSource[] {
    const typeOrder: Record<string, number> = { 'hls': 0, 'mp4': 1, 'webm': 2, 'dash': 3, 'unknown': 4 };
    return sources.sort((a, b) => {
      const orderA = typeOrder[a.type] ?? 99;
      const orderB = typeOrder[b.type] ?? 99;
      return orderA - orderB;
    });
  }
} 