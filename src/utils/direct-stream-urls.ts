export interface DirectStreamInfo {
  url: string;
  provider: string;
  quality: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
}

export class DirectStreamUrls {
  /**
   * Legacy helper retained for compatibility. SuperEmbed renders directly via iframe,
   * so this now returns an empty list.
   */
  static async getWorkingStreams(_tmdbId: string, _type: 'movie' | 'tv'): Promise<DirectStreamInfo[]> {
    console.warn('[DirectStreamUrls] Deprecated in SuperEmbed integration.');
    return [];
  }

  static sortStreamsByPreference(streams: DirectStreamInfo[]): DirectStreamInfo[] {
    return streams;
  }
}
