import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
  const cleanId = imdbId.replace('tt', '')
  
  switch (contentType.toLowerCase()) {
    case 'movie':
      return `https://www.2embed.cc/embed/tt${cleanId}`
    case 'tvseries':
    case 'tvSeries':
      if (season && episode) {
        return `https://www.2embed.cc/embedtv/tt${cleanId}&s=${season}&e=${episode}`
      }
      return `https://www.2embed.cc/embedtvfull/tt${cleanId}`
    case 'tvmovie':
    case 'tvMovie':
      return `https://www.2embed.cc/embed/tt${cleanId}`
    default:
      return `https://www.2embed.cc/embed/tt${cleanId}`
  }
} 