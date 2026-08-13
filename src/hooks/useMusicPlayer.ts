import { useCallback, useEffect, useRef, useState } from 'react';
import { getYouTubeThumbnail, isValidYouTubeIdentifier } from '../utils/youtube';
import type { ParsedMusicUrl } from '../utils/music';
import type { PlayerState, Track } from '../types/music';

interface YouTubePlayer {
  destroy(): void;
  setVolume(volume: number): void;
  getVideoData(): { video_id?: string; title?: string; author?: string };
  getDuration(): number;
  getCurrentTime(): number;
  getPlaylist(): string[] | null;
  cuePlaylist(options: { list: string; listType: 'playlist'; index?: number }): void;
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: { width: string; height: string; playerVars: Record<string, string | number>; events: Record<string, (event: { target: YouTubePlayer; data?: number }) => void> }) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number };
}

declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void; } }

const initialState: PlayerState = {
  isPlaying: false, isReady: false, hasLoaded: false, needsUserGesture: false,
  currentTrack: null, currentIndex: -1, playlist: [], currentTime: 0, duration: 0,
  volume: 70, isMuted: false, isShuffled: false, repeatMode: 'none', isLoading: false, error: null,
};

let iframeApi: Promise<void> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (iframeApi) return iframeApi;
  iframeApi = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
    script.onerror = () => reject(new Error('YouTube API failed to load.'));
    document.head.appendChild(script);
  });
  return iframeApi;
}

export function useMusicPlayer() {
  const [state, setState] = useState<PlayerState>(initialState);
  const stateRef = useRef(state); stateRef.current = state;
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef<Promise<YouTubePlayer> | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => { if (timerRef.current !== null) window.clearInterval(timerRef.current); timerRef.current = null; }, []);
  const ensurePlayer = useCallback(async () => {
    if (youtubeRef.current) return youtubeRef.current;
    if (readyRef.current) return readyRef.current;
    readyRef.current = (async () => {
      await loadYouTubeApi();
      if (!window.YT || !youtubeContainerRef.current) throw new Error('YouTube player is unavailable.');
      const host = document.createElement('div'); youtubeContainerRef.current.replaceChildren(host);
      return new Promise<YouTubePlayer>((resolve, reject) => {
        new window.YT!.Player(host, {
          width: '200', height: '200', playerVars: { controls: 0, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: event => { youtubeRef.current = event.target; resolve(event.target); },
            onStateChange: event => {
              if (!window.YT) return;
              if (event.data === window.YT.PlayerState.PLAYING) {
                const info = event.target.getVideoData(); const duration = event.target.getDuration() || stateRef.current.duration;
                setState(previous => ({ ...previous, isPlaying: true, isReady: true, isLoading: false, needsUserGesture: false, duration, currentTrack: previous.currentTrack ? { ...previous.currentTrack, title: info.title || previous.currentTrack.title, author: info.author || previous.currentTrack.author, duration } : null }));
                stopTimer(); timerRef.current = window.setInterval(() => { const player = youtubeRef.current; if (player) setState(previous => ({ ...previous, currentTime: player.getCurrentTime() || 0, duration: player.getDuration() || previous.duration })); }, 350);
              } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                stopTimer(); setState(previous => ({ ...previous, isPlaying: false, isLoading: false }));
              } else if (event.data === window.YT.PlayerState.CUED) {
                setState(previous => ({ ...previous, isReady: true, isLoading: false, needsUserGesture: true }));
              }
            },
            onError: () => setState(previous => ({ ...previous, isLoading: false, error: 'This YouTube track could not be played.' })),
          },
        });
        window.setTimeout(() => reject(new Error('YouTube API took too long to load.')), 15000);
      });
    })();
    return readyRef.current;
  }, [stopTimer]);

  const activate = useCallback(async (index: number) => {
    const track = stateRef.current.playlist[index]; if (!track) return;
    stopTimer(); youtubeRef.current?.pauseVideo();
    setState(previous => ({ ...previous, currentIndex: index, currentTrack: track, hasLoaded: true, isLoading: true, isPlaying: false, currentTime: 0, duration: track.duration, error: null }));
    try { const player = await ensurePlayer(); player.loadVideoById(track.id); player.playVideo(); }
    catch (error) { setState(previous => ({ ...previous, isLoading: false, error: error instanceof Error ? error.message : 'YouTube could not start.' })); }
  }, [ensurePlayer, stopTimer]);

  const addMusic = useCallback(async (resource: ParsedMusicUrl) => {
    setState(previous => ({ ...previous, isLoading: true, error: null }));
    if (resource.type === 'video') {
      const track: Track = { id: resource.id, source: 'youtube', title: 'YouTube video', author: 'YouTube', duration: 0, thumbnail: getYouTubeThumbnail(resource.id) };
      let index = 0; setState(previous => { index = previous.playlist.length; return { ...previous, playlist: [...previous.playlist, track], isLoading: false, hasLoaded: true }; });
      window.setTimeout(() => { void activate(index); }, 0); return;
    }
    if (!isValidYouTubeIdentifier(resource.id, 'playlist')) throw new Error('Unsupported or invalid YouTube URL.');
    const player = await ensurePlayer(); player.pauseVideo();
    await new Promise<void>(resolve => { player.cuePlaylist({ list: resource.id, listType: 'playlist', index: 0 }); window.setTimeout(resolve, 900); });
    const tracks: Track[] = (player.getPlaylist() || []).map(id => ({ id, source: 'youtube', title: 'YouTube video', author: 'YouTube', duration: 0, thumbnail: getYouTubeThumbnail(id) }));
    if (!tracks.length) throw new Error('This YouTube playlist could not be loaded.');
    let index = 0; setState(previous => { index = previous.playlist.length; return { ...previous, playlist: [...previous.playlist, ...tracks], isLoading: false, hasLoaded: true }; });
    window.setTimeout(() => { void activate(index); }, 0);
  }, [activate, ensurePlayer]);

  const play = useCallback(() => youtubeRef.current?.playVideo(), []);
  const togglePlay = useCallback(() => { if (stateRef.current.isPlaying) youtubeRef.current?.pauseVideo(); else youtubeRef.current?.playVideo(); }, []);
  const nextTrack = useCallback(() => { const { currentIndex, playlist, repeatMode } = stateRef.current; if (currentIndex + 1 < playlist.length) void activate(currentIndex + 1); else if (repeatMode === 'all') void activate(0); }, [activate]);
  const prevTrack = useCallback(() => { const { currentIndex, currentTime } = stateRef.current; if (currentTime > 3) youtubeRef.current?.seekTo(0, true); else if (currentIndex > 0) void activate(currentIndex - 1); }, [activate]);
  const seek = useCallback((time: number) => { youtubeRef.current?.seekTo(time, true); setState(previous => ({ ...previous, currentTime: time })); }, []);
  const setVolume = useCallback((volume: number) => { const next = Math.max(0, Math.min(100, volume)); youtubeRef.current?.setVolume(next); if (next) youtubeRef.current?.unMute(); setState(previous => ({ ...previous, volume: next, isMuted: next === 0 })); }, []);
  const toggleMute = useCallback(() => setState(previous => { if (previous.isMuted) youtubeRef.current?.unMute(); else youtubeRef.current?.mute(); return { ...previous, isMuted: !previous.isMuted }; }), []);
  const toggleShuffle = useCallback(() => setState(previous => ({ ...previous, isShuffled: !previous.isShuffled })), []);
  const toggleRepeat = useCallback(() => setState(previous => ({ ...previous, repeatMode: previous.repeatMode === 'none' ? 'all' : previous.repeatMode === 'all' ? 'one' : 'none' })), []);
  const dismissError = useCallback(() => setState(previous => ({ ...previous, error: null })), []);
  useEffect(() => () => { stopTimer(); try { youtubeRef.current?.destroy(); } catch { /* already released */ } }, [stopTimer]);
  return { state, youtubeContainerRef, addMusic, play, togglePlay, seek, setVolume, toggleMute, nextTrack, prevTrack, playTrackAt: (index: number) => void activate(index), toggleShuffle, toggleRepeat, dismissError };
}
