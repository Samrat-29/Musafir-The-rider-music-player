export type MusicSource = 'youtube';

export interface Track {
  id: string;
  source: MusicSource;
  title: string;
  author: string;
  album?: string;
  trackNumber?: number;
  duration: number;
  thumbnail: string;
  externalUrl?: string;
}

export interface PlayerState {
  isPlaying: boolean;
  isReady: boolean;
  hasLoaded: boolean;
  needsUserGesture: boolean;
  currentTrack: Track | null;
  currentIndex: number;
  playlist: Track[];
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'all' | 'one';
  isLoading: boolean;
  error: string | null;
}
