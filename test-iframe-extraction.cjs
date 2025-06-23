const https = require('https');
const { URL } = require('url');

// Simple fetch implementation for Node.js with redirect support
function nodeFetch(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        console.log(`  📍 Redirect ${res.statusCode}: ${url} -> ${redirectUrl}`);
        nodeFetch(redirectUrl, options, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
          url: url // Track final URL
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testIframeExtraction() {
  console.log('🧪 Testing iframe extraction from streamingnow...');

  try {
    // Step 1: Get multiembed page
    console.log('Step 1: Fetching multiembed page...');
    const embedUrl = 'https://multiembed.mov/?video_id=574475&tmdb=1';
    const embedResponse = await nodeFetch(embedUrl);
    
    if (!embedResponse.ok) {
      throw new Error(`Multiembed failed: ${embedResponse.status}`);
    }
    
    const embedHtml = await embedResponse.text();
    console.log(`✅ Multiembed page fetched (${embedHtml.length} chars)`);

    // Step 2: Find streamingnow URL
    const streamingNowPattern = /https:\/\/streamingnow\.mov[^"'\s]*/gi;
    const streamingNowMatches = embedHtml.match(streamingNowPattern);
    
    if (!streamingNowMatches) {
      throw new Error('No streamingnow URL found');
    }
    
    const streamingNowUrl = streamingNowMatches[0];
    console.log(`✅ Found streamingnow URL: ${streamingNowUrl}`);

    // Step 3: Get streamingnow page
    console.log('Step 3: Fetching streamingnow page...');
    const streamingResponse = await nodeFetch(streamingNowUrl, {
      headers: { 'Referer': 'https://multiembed.mov/' }
    });
    
    if (!streamingResponse.ok) {
      throw new Error(`StreamingNow failed: ${streamingResponse.status}`);
    }
    
    const streamingHtml = await streamingResponse.text();
    console.log(`✅ StreamingNow page fetched (${streamingHtml.length} chars)`);

    // Step 4: Since there are no iframes, look for JavaScript-embedded streams
    console.log('Step 4: No iframes found - looking for JavaScript streams...');
    
         // Look for video streams directly in the HTML/JS
     const streamPatterns = [
       // HLS streams
       { pattern: /['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/gi, type: 'HLS' },
       // MP4 files  
       { pattern: /['"](https?:\/\/[^'"]*\.mp4[^'"]*)['"]/gi, type: 'MP4' },
       // JWPlayer file configs
       { pattern: /file\s*:\s*['"']([^'"]+)['"']/gi, type: 'JWPlayer file' },
       // Source configs
       { pattern: /source\s*:\s*['"']([^'"]+)['"']/gi, type: 'Source' },
       // Video.js sources
       { pattern: /sources?\s*:\s*\[([^\]]+)\]/gi, type: 'Video.js sources' },
       // Generic video URLs
       { pattern: /['"](https?:\/\/[^'"]*(?:stream|video|media|play)[^'"]*)['"]/gi, type: 'Video URL' },
       // Blob URLs (often used for streaming)
       { pattern: /['"](blob:https?:\/\/[^'"]+)['"]/gi, type: 'Blob URL' },
       // Base64 encoded URLs (common in streaming)
       { pattern: /['"]((?:aHR0cHM|aHR0cA)[A-Za-z0-9+/=]+)['"]/gi, type: 'Base64 URL' },
       // JWPlayer setup patterns
       { pattern: /jwplayer\s*\([^)]*\)\.setup\s*\(\s*({[^}]*})/gi, type: 'JWPlayer setup' },
       // Minified streaming variables
       { pattern: /[a-zA-Z_$][\w$]*\s*=\s*['"']([^'"]*(?:\.m3u8|\.mp4|stream|video)[^'"]*)['"']/gi, type: 'Streaming variable' },
     ];
    
    const foundStreams = {};
    
    streamPatterns.forEach(({ pattern, type }) => {
      let match;
      const typeStreams = [];
      
      while ((match = pattern.exec(streamingHtml)) !== null) {
        let streamUrl = match[1];
        
        // Skip self-references and embed services
        if (streamUrl && !streamUrl.includes('streamingnow.mov') && 
            !streamUrl.includes('multiembed.mov') && streamUrl.length > 10) {
          
          // For sources array, try to parse JSON
          if (type === 'Video.js sources') {
            try {
              const sourcesArray = JSON.parse('[' + streamUrl + ']');
              sourcesArray.forEach(source => {
                if (typeof source === 'object' && source.src) {
                  typeStreams.push(source.src);
                } else if (typeof source === 'string') {
                  typeStreams.push(source);
                }
              });
            } catch (e) {
              // Ignore JSON parse errors
            }
                     } else if (type === 'Base64 URL') {
             // Try to decode base64 URLs
             try {
               const decoded = Buffer.from(streamUrl, 'base64').toString('utf8');
               if (decoded.startsWith('http')) {
                 typeStreams.push(decoded);
                 console.log(`  🔓 Decoded: ${streamUrl.substring(0, 20)}... -> ${decoded}`);
               }
             } catch (e) {
               // Not valid base64, skip
             }
           } else {
             typeStreams.push(streamUrl);
           }
         }
       }
       
       if (typeStreams.length > 0) {
         foundStreams[type] = [...new Set(typeStreams)]; // Remove duplicates
       }
     });
    
    console.log('🔍 Stream search results:');
    Object.entries(foundStreams).forEach(([type, streams]) => {
      console.log(`  ${type}: ${streams.length} found`);
      streams.slice(0, 3).forEach((stream, i) => {
        console.log(`    ${i + 1}: ${stream.substring(0, 100)}${stream.length > 100 ? '...' : ''}`);
      });
    });
    
    // Step 5: Look for AJAX/fetch calls that might load streams
    console.log('Step 5: Looking for AJAX/fetch patterns...');
    const ajaxPatterns = [
      /fetch\s*\(\s*['"']([^'"]+)['"']/gi,
      /ajax\s*\(\s*['"']([^'"]+)['"']/gi,
      /\.get\s*\(\s*['"']([^'"]+)['"']/gi,
      /\.post\s*\(\s*['"']([^'"]+)['"']/gi,
      /XMLHttpRequest.*open\s*\(\s*['"'][^'"]*['"']\s*,\s*['"']([^'"]+)['"']/gi,
    ];
    
    const ajaxUrls = [];
    ajaxPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(streamingHtml)) !== null) {
        const url = match[1];
        if (url && url.startsWith('/') || url.startsWith('http')) {
          ajaxUrls.push(url);
        }
      }
    });
    
    if (ajaxUrls.length > 0) {
      console.log(`🌐 Found ${ajaxUrls.length} AJAX/fetch URLs:`);
      ajaxUrls.slice(0, 5).forEach((url, i) => {
        console.log(`  ${i + 1}: ${url}`);
      });
    } else {
      console.log('❌ No AJAX/fetch patterns found');
    }
    
    // Step 6: Look for video player initialization
    console.log('Step 6: Looking for video player setup...');
    const playerPatterns = [
      /jwplayer\s*\([^)]*\)\.setup\s*\(\s*({[^}]+})/gi,
      /new\s+(?:Video|Player)\s*\([^)]*\)/gi,
      /videojs\s*\([^)]*\)/gi,
      /Plyr\s*\([^)]*\)/gi,
    ];
    
    playerPatterns.forEach(pattern => {
      const matches = streamingHtml.match(pattern);
      if (matches) {
        console.log(`🎬 Found ${matches.length} video player initialization(s):`);
        matches.slice(0, 2).forEach((match, i) => {
          console.log(`  ${i + 1}: ${match.substring(0, 150)}...`);
        });
      }
    });

    console.log('\n🎉 Iframe extraction test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIframeExtraction(); 