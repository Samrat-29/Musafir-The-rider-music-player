import { parseYouTubeInput } from './youtube';

export type YouTubeResourceType = 'video' | 'playlist';

export interface ParsedYouTubeMusic {
  source: 'youtube';
  type: YouTubeResourceType;
  id: string;
}

export type ParsedMusicUrl = ParsedYouTubeMusic;

/** The one entry point for every URL accepted by the Add Music panel. */
export function parseMusicUrl(input: string): ParsedMusicUrl | null {
  const youtube = parseYouTubeInput(input);
  return youtube ? { source: 'youtube', ...youtube } : null;
}

export function actionLabel(resource: ParsedMusicUrl | null): string {
  if (!resource) return 'ADD MUSIC';
  return resource.type === 'video' ? 'ADD TRACK' : 'LOAD PLAYLIST';
}
