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
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  getPlayerState(): number;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: Record<string, (event: { target: YouTubePlayer; data?: number }) => void>;
    }
  ) => YouTubePlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const DEFAULT_PLAYLIST_ID = 'PLAFjPVdERAkt7jNU1XW7EWXHLyYyf7Sux';
const DEFAULT_PLAYLIST_CACHE_KEY = `musafir:default-playlist:${DEFAULT_PLAYLIST_ID}:v1`;
const PLAYLIST_POLL_INTERVAL_MS = 100;
const PLAYLIST_POLL_TIMEOUT_MS = 12_000;
const PLAYLIST_BATCH_SIZE = 24;

interface CachedDefaultPlaylist {
  playlistId: string;
  savedAt: number;
  tracks: Track[];
}

function createTrack(id: string, index: number, existing?: Track): Track {
  return {
    id,
    source: 'youtube',
    title: existing?.title || (index === 0 ? 'Loading track...' : `Track ${index + 1}`),
    author: existing?.author || 'YouTube',
    duration: existing?.duration || 0,
    thumbnail: getYouTubeThumbnail(id),
  };
}

function readDefaultPlaylistCache(): Track[] | null {
  try {
    const rawCache = window.localStorage.getItem(DEFAULT_PLAYLIST_CACHE_KEY);
    if (!rawCache) return null;

    const cached = JSON.parse(rawCache) as CachedDefaultPlaylist;
    if (cached.playlistId !== DEFAULT_PLAYLIST_ID || !Array.isArray(cached.tracks)) return null;

    const tracks = cached.tracks
      .filter(track => isValidYouTubeIdentifier(track.id, 'video'))
      .map((track, index) => createTrack(track.id, index, track));

    return tracks.length ? tracks : null;
  } catch {
    return null;
  }
}

function writeDefaultPlaylistCache(tracks: Track[]) {
  try {
    const cache: CachedDefaultPlaylist = {
      playlistId: DEFAULT_PLAYLIST_ID,
      savedAt: Date.now(),
      tracks,
    };
    window.localStorage.setItem(DEFAULT_PLAYLIST_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable in private browsing or when it is full.
  }
}

function waitForPlaylistIds(player: YouTubePlayer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + PLAYLIST_POLL_TIMEOUT_MS;
    let intervalId: number | null = null;
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      callback();
    };

    const checkPlaylist = () => {
      const ids = player.getPlaylist() || [];
      if (ids.length) {
        finish(() => resolve(ids));
      } else if (Date.now() >= deadline) {
        finish(() => reject(new Error('The default playlist did not become available.')));
      }
    };

    intervalId = window.setInterval(checkPlaylist, PLAYLIST_POLL_INTERVAL_MS);
    checkPlaylist();
  });
}

function waitForFirstPlaylistVideo(player: YouTubePlayer): Promise<string> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + PLAYLIST_POLL_TIMEOUT_MS;
    let intervalId: number | null = null;
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      callback();
    };

    const checkFirstVideo = () => {
      const videoId = player.getVideoData().video_id || player.getPlaylist()?.[0];
      if (videoId && isValidYouTubeIdentifier(videoId, 'video')) {
        finish(() => resolve(videoId));
      } else if (Date.now() >= deadline) {
        finish(() => reject(new Error('The first default track did not become available.')));
      }
    };

    intervalId = window.setInterval(checkFirstVideo, PLAYLIST_POLL_INTERVAL_MS);
    checkFirstVideo();
  });
}

const initialState: PlayerState = {
  isPlaying: false,
  isReady: false,
  hasLoaded: false,
  needsUserGesture: false,
  currentTrack: null,
  currentIndex: -1,
  playlist: [],
  currentTime: 0,
  duration: 0,
  volume: 70,
  isMuted: false,
  isShuffled: false,
  repeatMode: 'none',
  isLoading: false,
  error: null,
};

let iframeApi: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (iframeApi) return iframeApi;
  iframeApi = new Promise((resolve, reject) => {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existing?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('YouTube API failed to load.'));
    document.head.appendChild(script);
  });
  return iframeApi;
}

export function useMusicPlayer() {
  const [state, setState] = useState<PlayerState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const playerReadyPromiseRef = useRef<Promise<YouTubePlayer> | null>(null);
  const timerRef = useRef<number | null>(null);
  const defaultLoadedRef = useRef(false);
  const playlistRequestRef = useRef(0);

  // ─── Timer helpers ───────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      const player = youtubeRef.current;
      if (player) {
        setState(prev => ({
          ...prev,
          currentTime: player.getCurrentTime() || 0,
          duration: player.getDuration() || prev.duration,
        }));
      }
    }, 350);
  }, [stopTimer]);

  // ─── YouTube Player lifecycle ─────────────────────────────────────────────────
  // We use a ref to hold activateTrack so onStateChange ENDED can call it
  const activateTrackRef = useRef<((track: Track, index: number, playlist: Track[]) => Promise<void>) | undefined>(undefined);

  const ensurePlayer = useCallback((): Promise<YouTubePlayer> => {
    if (youtubeRef.current) return Promise.resolve(youtubeRef.current);
    if (playerReadyPromiseRef.current) return playerReadyPromiseRef.current;

    playerReadyPromiseRef.current = (async () => {
      await loadYouTubeApi();

      if (!window.YT || !youtubeContainerRef.current) {
        throw new Error('YouTube player is unavailable.');
      }

      const host = document.createElement('div');
      youtubeContainerRef.current.replaceChildren(host);

      return new Promise<YouTubePlayer>((resolve, reject) => {
        const timeoutId = window.setTimeout(
          () => reject(new Error('YouTube API took too long to initialize.')),
          20_000
        );

        new window.YT!.Player(host, {
          width: '200',
          height: '200',
          playerVars: {
            controls: 0,
            playsinline: 1,
            disablekb: 1,
            origin: window.location.origin,
            // Start YouTube's playlist request while the iframe itself initializes.
            listType: 'playlist',
            list: DEFAULT_PLAYLIST_ID,
            index: 0,
          },
          events: {
            onReady: event => {
              window.clearTimeout(timeoutId);
              youtubeRef.current = event.target;
              event.target.setVolume(stateRef.current.volume);
              // The iframe is usable now. Playlist discovery must not keep the
              // actual Play button in a loading state.
              setState(prev => ({
                ...prev,
                isReady: true,
                isLoading: false,
                needsUserGesture: true,
              }));
              resolve(event.target);
            },
            onStateChange: event => {
              if (!window.YT) return;
              const YTState = window.YT.PlayerState;

              if (event.data === YTState.UNSTARTED) {
                setState(prev => ({
                  ...prev,
                  isReady: true,
                  isPlaying: false,
                  isLoading: false,
                  needsUserGesture: true,
                }));
              } else if (event.data === YTState.PLAYING) {
                const info = event.target.getVideoData();
                const duration = event.target.getDuration() || stateRef.current.duration;
                setState(prev => ({
                  ...prev,
                  isPlaying: true,
                  isReady: true,
                  isLoading: false,
                  needsUserGesture: false,
                  duration,
                  currentTrack: prev.currentTrack
                    ? {
                        ...prev.currentTrack,
                        title: info.title || prev.currentTrack.title,
                        author: info.author || prev.currentTrack.author,
                        duration,
                      }
                    : null,
                }));
                startProgressTimer();
              } else if (event.data === YTState.PAUSED) {
                stopTimer();
                setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
              } else if (event.data === YTState.ENDED) {
                stopTimer();
                setState(prev => ({
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  currentTime: prev.duration,
                }));
                // Auto-advance using current ref values
                const { currentIndex, playlist, repeatMode } = stateRef.current;
                const nextIndex = currentIndex + 1 < playlist.length
                  ? currentIndex + 1
                  : repeatMode === 'all' ? 0 : -1;
                if (nextIndex >= 0 && playlist[nextIndex]) {
                  void activateTrackRef.current?.(playlist[nextIndex], nextIndex, playlist);
                }
              } else if (event.data === YTState.CUED) {
                stopTimer();
                const info = event.target.getVideoData();
                const duration = event.target.getDuration() || stateRef.current.duration;
                setState(prev => ({
                  ...prev,
                  isReady: true,
                  isLoading: false,
                  isPlaying: false,
                  needsUserGesture: true,
                  duration,
                  currentTrack: prev.currentTrack && prev.currentTrack.id === info.video_id
                    ? {
                        ...prev.currentTrack,
                        title: info.title || prev.currentTrack.title,
                        author: info.author || prev.currentTrack.author,
                        duration,
                      }
                    : prev.currentTrack,
                }));
              } else if (event.data === YTState.BUFFERING) {
                setState(prev => ({ ...prev, isLoading: !prev.isReady }));
              }
            },
            onError: () => {
              setState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: false,
                error: 'This YouTube track could not be played.',
              }));
            },
          },
        });
      });
    })().catch(err => {
      playerReadyPromiseRef.current = null;
      throw err;
    });

    return playerReadyPromiseRef.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTimer, startProgressTimer]);

  /**
   * Core activation: load a specific track into the player.
   * Takes track, index, AND the current playlist array directly so it doesn't
   * depend on stateRef.current.playlist (which may not be updated yet after
   * a setState call that happened in the same microtask).
   */
  const activateTrack = useCallback(async (
    track: Track,
    index: number,
    playlist: Track[]
  ) => {
    stopTimer();
    youtubeRef.current?.pauseVideo();

    setState(_prev => ({
      ..._prev,
      playlist,
      currentIndex: index,
      currentTrack: track,
      hasLoaded: true,
      isLoading: true,
      isPlaying: false,
      needsUserGesture: false,
      currentTime: 0,
      duration: track.duration || 0,
      error: null,
    }));

    try {
      const player = await ensurePlayer();
      player.setVolume(stateRef.current.volume);
      player.loadVideoById(track.id);
      // Try to autoplay — browser may silently ignore this
      try {
        player.playVideo();
      } catch {
        setState(prev => ({ ...prev, isLoading: false, needsUserGesture: true }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'YouTube could not start.',
      }));
    }
  }, [ensurePlayer, stopTimer]);

  // Keep the ref in sync
  activateTrackRef.current = activateTrack;

  /**
   * Convenience wrapper that reads from state — safe to call when state is
   * already up to date (e.g. user clicking prev/next).
   */
  const activateIndex = useCallback((index: number) => {
    const { playlist } = stateRef.current;
    const track = playlist[index];
    if (!track) return Promise.resolve();
    return activateTrack(track, index, playlist);
  }, [activateTrack]);

  // ─── Default playlist — hydrate immediately, refresh IDs in the background ────
  useEffect(() => {
    if (defaultLoadedRef.current) return;
    defaultLoadedRef.current = true;
    const requestId = ++playlistRequestRef.current;
    const cachedTracks = readDefaultPlaylistCache();

    setState(prev => ({
      ...prev,
      hasLoaded: true,
      isLoading: true,
      currentTrack: cachedTracks?.[0] ?? null,
      currentIndex: cachedTracks ? 0 : -1,
      playlist: cachedTracks ?? [],
      error: null,
    }));

    const loadDefault = async () => {
      try {
        const player = await ensurePlayer();
        player.setVolume(70);

        // The first video is the only blocking playlist work. The complete ID
        // list is collected separately and never delays the playable control.
        const playlistIdsPromise = waitForPlaylistIds(player);
        const firstVideoId = await waitForFirstPlaylistVideo(player);
        if (playlistRequestRef.current !== requestId) return;

        const cachedById = new Map((cachedTracks || []).map(track => [track.id, track]));
        const firstInfo = player.getVideoData();
        const firstTrack: Track = {
          ...createTrack(firstVideoId, 0, cachedById.get(firstVideoId)),
          title: firstInfo.video_id === firstVideoId
            ? firstInfo.title || cachedById.get(firstVideoId)?.title || 'Loading track...'
            : cachedById.get(firstVideoId)?.title || 'Loading track...',
          author: firstInfo.video_id === firstVideoId
            ? firstInfo.author || cachedById.get(firstVideoId)?.author || 'YouTube'
            : cachedById.get(firstVideoId)?.author || 'YouTube',
          duration: firstInfo.video_id === firstVideoId
            ? player.getDuration() || cachedById.get(firstVideoId)?.duration || 0
            : cachedById.get(firstVideoId)?.duration || 0,
        };

        setState(prev => ({
          ...prev,
          currentTrack: firstTrack,
          currentIndex: 0,
          playlist: [firstTrack],
          hasLoaded: true,
          isReady: true,
          isLoading: false,
          needsUserGesture: true,
          error: null,
        }));

        // This may be rejected by the browser's autoplay policy. The CUED/PAUSED
        // events keep the real Play button available either way.
        try {
          player.playVideo();
        } catch {
          setState(prev => ({ ...prev, needsUserGesture: true }));
        }

        void playlistIdsPromise.then(ids => {
          if (playlistRequestRef.current !== requestId) return;

          const tracks = ids.map((id, index) => createTrack(id, index, cachedById.get(id)));
          const firstTrackIndex = tracks.findIndex(track => track.id === firstVideoId);
          if (firstTrackIndex > 0) {
            const [matchedTrack] = tracks.splice(firstTrackIndex, 1);
            tracks.unshift(matchedTrack);
          }
          tracks[0] = firstTrack;

          let visibleCount = 1;
          const publishNextBatch = () => {
            if (playlistRequestRef.current !== requestId) return;

            visibleCount = Math.min(visibleCount + PLAYLIST_BATCH_SIZE, tracks.length);
            setState(prev => ({
              ...prev,
              playlist: tracks.slice(0, visibleCount),
              currentTrack: prev.currentTrack?.id === firstTrack.id ? firstTrack : prev.currentTrack,
            }));

            if (visibleCount < tracks.length) {
              window.setTimeout(publishNextBatch, 0);
            } else {
              writeDefaultPlaylistCache(tracks);
            }
          };

          publishNextBatch();
        }).catch(err => {
          console.warn('Default playlist background refresh failed:', err);
        });
      } catch (err) {
        console.warn('Default playlist load failed:', err);
        if (playlistRequestRef.current === requestId) {
          setState(prev => ({ ...prev, isLoading: false, error: null }));
        }
      }
    };

    void loadDefault();
  // Run exactly once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensurePlayer]);

  // ─── addMusic — replace playlist with user's choice ───────────────────────────
  const addMusic = useCallback(async (resource: ParsedMusicUrl) => {
    playlistRequestRef.current += 1;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (resource.type === 'video') {
      const track: Track = {
        id: resource.id,
        source: 'youtube',
        title: 'YouTube video',
        author: 'YouTube',
        duration: 0,
        thumbnail: getYouTubeThumbnail(resource.id),
      };
      await activateTrack(track, 0, [track]);
      return;
    }

    if (!isValidYouTubeIdentifier(resource.id, 'playlist')) {
      throw new Error('Unsupported or invalid YouTube URL.');
    }

    const player = await ensurePlayer();
    player.pauseVideo();
    player.cuePlaylist({ list: resource.id, listType: 'playlist', index: 0 });
    await new Promise<void>(resolve => window.setTimeout(resolve, 1500));

    const ids: string[] = player.getPlaylist() || [];
    if (!ids.length) throw new Error('This YouTube playlist could not be loaded or is empty.');

    const tracks: Track[] = ids.map((id, i) => ({
      id,
      source: 'youtube',
      title: `Track ${i + 1}`,
      author: 'YouTube',
      duration: 0,
      thumbnail: getYouTubeThumbnail(id),
    }));

    await activateTrack(tracks[0], 0, tracks);
  }, [activateTrack, ensurePlayer]);

  // ─── Playback controls ────────────────────────────────────────────────────────
  const play = useCallback(() => {
    youtubeRef.current?.playVideo();
    setState(prev => ({ ...prev, needsUserGesture: false }));
  }, []);

  const togglePlay = useCallback(() => {
    if (stateRef.current.isPlaying) {
      youtubeRef.current?.pauseVideo();
    } else {
      youtubeRef.current?.playVideo();
      setState(prev => ({ ...prev, needsUserGesture: false }));
    }
  }, []);

  const nextTrack = useCallback(() => {
    const { currentIndex, playlist, repeatMode } = stateRef.current;
    if (currentIndex + 1 < playlist.length) {
      void activateIndex(currentIndex + 1);
    } else if (repeatMode === 'all') {
      void activateIndex(0);
    }
  }, [activateIndex]);

  const prevTrack = useCallback(() => {
    const { currentIndex, currentTime } = stateRef.current;
    if (currentTime > 3) {
      youtubeRef.current?.seekTo(0, true);
      setState(prev => ({ ...prev, currentTime: 0 }));
    } else if (currentIndex > 0) {
      void activateIndex(currentIndex - 1);
    } else {
      youtubeRef.current?.seekTo(0, true);
      setState(prev => ({ ...prev, currentTime: 0 }));
    }
  }, [activateIndex]);

  const seek = useCallback((time: number) => {
    youtubeRef.current?.seekTo(time, true);
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const next = Math.max(0, Math.min(100, volume));
    if (youtubeRef.current) {
      youtubeRef.current.setVolume(next);
      if (next > 0) youtubeRef.current.unMute();
    }
    setState(prev => ({ ...prev, volume: next, isMuted: next === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => {
      if (prev.isMuted) youtubeRef.current?.unMute();
      else youtubeRef.current?.mute();
      return { ...prev, isMuted: !prev.isMuted };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({
      ...prev,
      repeatMode:
        prev.repeatMode === 'none' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'none',
    }));
  }, []);

  const dismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      stopTimer();
      try {
        youtubeRef.current?.destroy();
      } catch {
        /* already released */
      }
    },
    [stopTimer]
  );

  return {
    state,
    youtubeContainerRef,
    addMusic,
    play,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    playTrackAt: (index: number) => void activateIndex(index),
    toggleShuffle,
    toggleRepeat,
    dismissError,
  };
}
