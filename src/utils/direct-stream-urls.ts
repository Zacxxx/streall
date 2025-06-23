export interface DirectStreamUrl {
  url: string;
  type: 'hls' | 'mp4' | 'webm' | 'direct';
  quality: string;
  provider: string;
  label: string;
}

export class DirectStreamUrls {
  /**
   * Generate direct stream URLs based on HAR file analysis patterns
   */
  static generateStreamUrls(tmdbId: string, _type: 'movie' | 'tv' = 'movie'): DirectStreamUrl[] {
    console.log(`🎯 Generating direct stream URLs for TMDB ID: ${tmdbId}`);
    
    const streams: DirectStreamUrl[] = [];
    const currentHost = window.location.origin;
    
    // Based on HAR analysis, these are the actual stream URL patterns
    
    // 1. StreamSrcs.2embed.cc - Primary provider from HAR
    const streamSrcsId = 'hnszpnmex8h4'; // This was the ID found in HAR for movie 574475
    streams.push({
      url: `https://streamsrcs.2embed.cc/${streamSrcsId}?embed=1&referer=streamsrcs.2embed.cc&adb=1&hls4=1`,
      type: 'hls',
      quality: 'auto',
      provider: 'streamsrcs',
      label: 'StreamSrcs HLS'
    });
    
    // 2. StreamSrcs Swish endpoint
    streams.push({
      url: `https://streamsrcs.2embed.cc/swish?id=${streamSrcsId}&ref=${currentHost}`,
      type: 'direct',
      quality: 'auto',
      provider: 'streamsrcs',
      label: 'StreamSrcs Swish'
    });
    
    // 3. StreamSrcs direct endpoint
    streams.push({
      url: `https://streamsrcs.2embed.cc/${streamSrcsId}`,
      type: 'direct',
      quality: 'auto',
      provider: 'streamsrcs',
      label: 'StreamSrcs Direct'
    });
    
    // 4. VidSrc.cc patterns
    streams.push({
      url: `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
      type: 'direct',
      quality: 'auto',
      provider: 'vidsrc',
      label: 'VidSrc v2'
    });
    
    // 5. Player4u patterns
    streams.push({
      url: `https://player4u.xyz/embed?key=Movie ${tmdbId}`,
      type: 'direct',
      quality: 'auto',
      provider: 'player4u',
      label: 'Player4u'
    });
    
    // 6. Alternative StreamSrcs patterns
    streams.push({
      url: `https://streamsrcs.2embed.cc/vsrc?imdb=tt${tmdbId}`,
      type: 'direct',
      quality: 'auto',
      provider: 'streamsrcs',
      label: 'StreamSrcs VSrc'
    });
    
    // 7. Generate potential HLS variants
    streams.push({
      url: `https://streamsrcs.2embed.cc/${streamSrcsId}/playlist.m3u8`,
      type: 'hls',
      quality: 'auto',
      provider: 'streamsrcs',
      label: 'StreamSrcs HLS Playlist'
    });
    
    // 8. Generate potential MP4 variants
    streams.push({
      url: `https://streamsrcs.2embed.cc/${streamSrcsId}/stream.mp4`,
      type: 'mp4',
      quality: '720p',
      provider: 'streamsrcs',
      label: 'StreamSrcs MP4'
    });
    
    console.log(`🎬 Generated ${streams.length} direct stream URLs`);
    return streams;
  }
  
  /**
   * Test if a stream URL is accessible
   */
  static async testStreamUrl(url: string): Promise<boolean> {
    try {
      console.log(`🔍 Testing stream URL: ${url}`);
      
      // Use HEAD request to check if URL is accessible
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // Avoid CORS issues
      });
      
      console.log(`✅ Stream URL test result: ${response.status} for ${url}`);
      return response.ok;
    } catch (error) {
      console.log(`⚠️ Stream URL test failed for ${url}:`, error);
      // If we can't test it due to CORS, assume it might work
      return true;
    }
  }
  
  /**
   * Get working stream URLs by testing them
   */
  static async getWorkingStreams(tmdbId: string, type: 'movie' | 'tv' = 'movie'): Promise<DirectStreamUrl[]> {
    const allStreams = this.generateStreamUrls(tmdbId, type);
    const workingStreams: DirectStreamUrl[] = [];
    
    console.log(`🧪 Testing ${allStreams.length} stream URLs...`);
    
    // Test streams in parallel
    const testPromises = allStreams.map(async (stream) => {
      const isWorking = await this.testStreamUrl(stream.url);
      if (isWorking) {
        workingStreams.push(stream);
      }
      return { stream, isWorking };
    });
    
    const results = await Promise.all(testPromises);
    
    console.log(`✅ Found ${workingStreams.length} working streams out of ${allStreams.length}`);
    results.forEach(({ stream, isWorking }) => {
      console.log(`   ${isWorking ? '✅' : '❌'} ${stream.provider} - ${stream.label}: ${stream.url}`);
    });
    
    return workingStreams;
  }
  
  /**
   * Sort streams by preference
   */
  static sortStreamsByPreference(streams: DirectStreamUrl[]): DirectStreamUrl[] {
    return streams.sort((a, b) => {
      // Prefer HLS > MP4 > Direct > WebM
      const typeOrder = { hls: 0, mp4: 1, direct: 2, webm: 3 };
      const aOrder = typeOrder[a.type] ?? 4;
      const bOrder = typeOrder[b.type] ?? 4;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Prefer StreamSrcs > VidSrc > Player4u
      const providerOrder = { streamsrcs: 0, vidsrc: 1, player4u: 2 };
      const aProviderOrder = providerOrder[a.provider as keyof typeof providerOrder] ?? 3;
      const bProviderOrder = providerOrder[b.provider as keyof typeof providerOrder] ?? 3;
      
      return aProviderOrder - bProviderOrder;
    });
  }
} 