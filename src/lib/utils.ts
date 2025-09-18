import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { buildSuperEmbedUrl, normalizeImdbId } from "@/services/superembed-service"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYear(year: string | number): string {
  return year ? year.toString() : "N/A"
}

export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, char => char.toUpperCase())
}

export function generateEmbedUrl(
  imdbId: string,
  contentType: string,
  season?: number,
  episode?: number
): string {
  const normalizedId = normalizeImdbId(imdbId);
  const type = contentType.toLowerCase();
  const isTv = type.includes('tv');

  const options: { imdbId: string; season?: number; episode?: number } = { imdbId: normalizedId };

  if (isTv) {
    if (season) {
      options.season = season;
    }
    if (episode) {
      options.episode = episode;
    }

    return buildSuperEmbedUrl('tv', options);
  }

  return buildSuperEmbedUrl('movie', options);
}
