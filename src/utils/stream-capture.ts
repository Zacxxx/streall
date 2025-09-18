export interface CapturedStream {
  url: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
  quality?: string;
}

export class StreamCapture {
  static async captureStreamsFromEmbed(_embedUrl: string): Promise<CapturedStream[]> {
    console.warn('[StreamCapture] Deprecated in SuperEmbed integration.');
    return [];
  }

  static sortStreamsByPreference(streams: CapturedStream[]): CapturedStream[] {
    return streams;
  }
}
