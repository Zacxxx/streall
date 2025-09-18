export interface StreamSource {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
  quality?: string;
  label?: string;
}

export interface ExtractedStreams {
  sources: StreamSource[];
}

export class StreamExtractor {
  static async extractStreamsFromUrl(_embedUrl: string): Promise<ExtractedStreams | null> {
    console.warn('[StreamExtractor] Deprecated in SuperEmbed integration.');
    return null;
  }

  static sortSourcesByPreference(sources: StreamSource[]): StreamSource[] {
    return sources;
  }
}
