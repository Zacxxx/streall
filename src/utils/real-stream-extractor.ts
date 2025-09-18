export interface ProviderStream {
  url: string;
  provider: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
  quality?: string;
}

export class RealStreamExtractor {
  static async extractFromTMDBId(_tmdbId: string | number, _type: 'movie' | 'tv'): Promise<ProviderStream[]> {
    console.warn('[RealStreamExtractor] Deprecated in SuperEmbed integration.');
    return [];
  }

  static getBestSources(streams: ProviderStream[]): ProviderStream[] {
    return streams;
  }
}
