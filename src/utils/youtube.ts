export interface ParsedYouTube {
  type: 'video' | 'playlist';
  id: string;
}

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const playlistIdPattern = /^(?:PL|RD|OL|UU|LL|FL)[A-Za-z0-9_-]+$/;

/** Checks an already-extracted identifier before it reaches the IFrame API. */
export function isValidYouTubeIdentifier(id: string, type: ParsedYouTube['type']): boolean {
  return type === 'video'
    ? videoIdPattern.test(id)
    : /^[A-Za-z0-9_-]{10,200}$/.test(id);
}

/**
 * Parses public YouTube watch, share, embed and playlist links, plus raw IDs.
 * A `list` parameter always wins so a watch link that opens a playlist loads
 * that playlist rather than silently loading only its current video.
 */
export function parseYouTubeInput(input: string): ParsedYouTube | null {
  const value = input.trim();
  if (!value) return null;

  const iframeSource = value.match(/src=["']([^"']+)["']/i)?.[1];
  const candidate = iframeSource ?? value;

  if (playlistIdPattern.test(candidate)) return { type: 'playlist', id: candidate };
  if (videoIdPattern.test(candidate)) return { type: 'video', id: candidate };

  try {
    const url = new URL(candidate.startsWith('http') ? candidate : `https://${candidate}`);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const isYouTube = host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be';
    if (!isYouTube) return null;

    const list = url.searchParams.get('list');
    if (list && isValidYouTubeIdentifier(list, 'playlist')) return { type: 'playlist', id: list };

    let videoId: string | null = null;
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    else if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] ?? null;
    else videoId = url.searchParams.get('v');

    return videoId && videoIdPattern.test(videoId) ? { type: 'video', id: videoId } : null;
  } catch {
    return null;
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const filename = { default: 'default', medium: 'mqdefault', high: 'hqdefault', maxres: 'maxresdefault' }[quality];
  return `https://i.ytimg.com/vi/${videoId}/${filename}.jpg`;
}
