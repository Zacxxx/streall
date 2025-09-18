export interface RedirectAnalysis {
  streamingProvider: string;
  hops: string[];
}

export class RedirectFollower {
  static async followRedirectChain(_url: string): Promise<RedirectAnalysis> {
    console.warn('[RedirectFollower] Deprecated in SuperEmbed integration.');
    return {
      streamingProvider: 'deprecated',
      hops: [],
    };
  }

  static generateStreamingUrls(_analysis: RedirectAnalysis): string[] {
    return [];
  }
}
