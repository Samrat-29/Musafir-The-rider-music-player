import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoBackground from './components/VideoBackground';
import Navigation from './components/Navigation';
import MusicPlayer from './components/MusicPlayer';
import PlaylistModal from './components/PlaylistModal';
import PlaylistDrawer from './components/PlaylistDrawer';
import AboutModal from './components/AboutModal';
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { useOnlinePresence } from './hooks/useOnlinePresence';
import type { ParsedMusicUrl } from './utils/music';

export default function App() {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const onlineCount = useOnlinePresence();

  const {
    state: playerState,
    youtubeContainerRef,
    addMusic,
    play,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    playTrackAt,
    toggleShuffle,
    toggleRepeat,
    dismissError,
  } = useMusicPlayer();

  const handleLoadMusic = useCallback(
    async (resource: ParsedMusicUrl) => {
      await addMusic(resource);
    },
    [addMusic]
  );

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (playerState.isReady) togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (playerState.isReady) nextTrack();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (playerState.isReady) prevTrack();
          break;
        case 'm': case 'M':
          if (playerState.isReady) toggleMute();
          break;
        case 'f': case 'F':
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
          break;
        case 'Escape':
          setShowPlaylistModal(false);
          setShowPlaylistDrawer(false);
          setShowAbout(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerState.isReady, togglePlay, nextTrack, prevTrack, toggleMute]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Video Background */}
      <VideoBackground onLoaded={() => {}} />

      {/* Hidden YouTube player */}
      <div ref={youtubeContainerRef} className="yt-player-container" />

      {/* Main UI — always visible immediately */}
      <motion.div
        className="relative z-10 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Navigation */}
        <Navigation
          onMusicClick={() => setShowPlaylistModal(true)}
          onAboutClick={() => setShowAbout(true)}
          onPlaylistClick={() => setShowPlaylistDrawer(true)}
          onlineCount={onlineCount}
        />

        {/* Music Player */}
        <MusicPlayer
          state={playerState}
          onTogglePlay={togglePlay}
          onPlay={play}
          onNext={nextTrack}
          onPrev={prevTrack}
          onSeek={seek}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onOpenPlaylist={() => setShowPlaylistDrawer(true)}
          onOpenAddMusic={() => setShowPlaylistModal(true)}
          onDismissError={dismissError}
        />
      </motion.div>

      {/* Modals */}
      <PlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        onLoad={handleLoadMusic}
      />

      <PlaylistDrawer
        isOpen={showPlaylistDrawer}
        onClose={() => setShowPlaylistDrawer(false)}
        playlist={playerState.playlist}
        currentIndex={playerState.currentIndex}
        onTrackSelect={(index) => {
          playTrackAt(index);
          setShowPlaylistDrawer(false);
        }}
      />

      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </div>
  );
}
