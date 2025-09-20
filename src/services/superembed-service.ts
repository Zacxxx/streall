const SUPEREMBED_BASE = 'https://multiembed.mov/';

export type SuperEmbedMediaType = 'movie' | 'tv';

export interface SuperEmbedSubtitleOptions {
  url: string;
  label: string;
}

export interface SuperEmbedOptions {
  imdbId?: string;
  tmdbId?: string | number;
  season?: number;
  episode?: number;
  useVip?: boolean;
  checkAvailability?: boolean;
  subtitle?: SuperEmbedSubtitleOptions;
  startTimeSeconds?: number;
  autoplay?: boolean;
}

export function normalizeImdbId(imdbId: string): string {
  const trimmed = imdbId.trim();
  if (!trimmed) {
    throw new Error('IMDB id cannot be empty');
  }

  if (trimmed.startsWith('tt')) {
    return trimmed;
  }

  const numeric = trimmed.replace(/^tt/i, '').replace(/[^0-9]/g, '');
  return numeric ? `tt${numeric}` : `tt${trimmed}`;
}

export function buildSuperEmbedUrl(type: SuperEmbedMediaType, options: SuperEmbedOptions): string {
  const params = new URLSearchParams();
  const imdbId = options.imdbId ? normalizeImdbId(options.imdbId) : undefined;
  const tmdbId = options.tmdbId !== undefined && options.tmdbId !== null ? String(options.tmdbId) : undefined;

  if (imdbId) {
    params.set('video_id', imdbId);
  } else if (tmdbId) {
    params.set('video_id', tmdbId);
    params.set('tmdb', '1');
  } else {
    throw new Error('SuperEmbed URL requires either an IMDB id or TMDB id');
  }

  if (type === 'tv') {
    if (options.season) {
      params.set('s', options.season.toString());
    }

    if (options.episode) {
      params.set('e', options.episode.toString());
    }
  }

  if (options.checkAvailability) {
    params.set('check', '1');
  }

  if (options.subtitle) {
    params.set('sub_url', options.subtitle.url);
    params.set('sub_label', options.subtitle.label);
  }

  if (options.autoplay) {
    params.set('autoplay', '1');
  }

  if (options.startTimeSeconds && options.startTimeSeconds > 0) {
    const resumeAt = Math.max(0, Math.floor(options.startTimeSeconds));
    const resumeValue = resumeAt.toString();
    params.set('start', resumeValue);
    params.set('t', resumeValue);
    params.set('time', resumeValue);
  }

  const basePath = options.useVip ? `${SUPEREMBED_BASE}directstream.php` : `${SUPEREMBED_BASE}`;
  const query = params.toString();
  return `${basePath}?${query}`;
}

export function buildSuperEmbedMovieUrl(options: SuperEmbedOptions): string {
  return buildSuperEmbedUrl('movie', options);
}

export function buildSuperEmbedEpisodeUrl(options: SuperEmbedOptions & { season: number; episode: number }): string {
  return buildSuperEmbedUrl('tv', options);
}
