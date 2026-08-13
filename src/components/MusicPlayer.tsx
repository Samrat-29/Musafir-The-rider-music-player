import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, List, Plus,
  Shuffle, Repeat, Repeat1, Music2, AlertCircle, Loader2,
} from 'lucide-react';
import { formatTime } from '../utils/youtube';
import type { PlayerState } from '../types/music';

interface MusicPlayerProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onPlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (t: number) => void;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onOpenPlaylist: () => void;
  onOpenAddMusic: () => void;
  onDismissError: () => void;
}

export default function MusicPlayer({
  state,
  onTogglePlay,
  onPlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onOpenPlaylist,
  onOpenAddMusic,
  onDismissError,
}: MusicPlayerProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [showVolume, setShowVolume] = useState(false);

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !state.duration) return;
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * state.duration);
  }, [state.duration, onSeek]);

  // Determine what UI state to show
  const showError = !!state.error;
  const showLoading = !state.error && state.isLoading && !state.currentTrack && !state.hasLoaded;
  // Show full player UI if:
  //   - We have a current track, OR
  //   - Playlist is loaded (hasLoaded=true) and we're loading the first track
  const showPlayer = !state.error && (!!state.currentTrack || (state.hasLoaded && state.isLoading));
  // Show empty "add music" prompt only when nothing has been loaded at all
  const showEmpty = !state.error && !state.isLoading && !state.hasLoaded && !state.currentTrack;

  return (
    <motion.div
      className="music-player-shell fixed z-30 flex px-4"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: 'rgba(8, 8, 8, 0.82)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        boxShadow: '0 16px 55px rgba(0,0,0,0.58)',
        overflow: 'hidden',
      }}>

        {/* ── Thin decorative progress bar — top edge ── */}
        <div
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.08)',
            position: 'relative',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: state.isPlaying
                ? 'rgba(255,255,255,0.75)'
                : 'rgba(255,255,255,0.35)',
              borderRadius: 2,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '7px 10px 6px' }}>

          {/* ─── State: Error ─── */}
          {showError && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <AlertCircle size={16} style={{ color: 'rgba(230,120,100,0.9)', flexShrink: 0 }} strokeWidth={1.5} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.72rem', color: 'rgba(230,120,100,0.9)', lineHeight: 1.4 }}>
                  {state.error}
                </p>
              </div>
              <button
                onClick={onDismissError}
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.35)', background: 'none',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer',
                }}
              >
                DISMISS
              </button>
              <button
                onClick={onOpenAddMusic}
                style={{
                  fontSize: '0.6rem', letterSpacing: '0.15em',
                  color: 'rgba(255,255,255,0.6)', background: 'none',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer',
                }}
              >
                TRY AGAIN
              </button>
            </motion.div>
          )}

          {/* ─── State: Initial loading (no track yet) ─── */}
          {showLoading && (
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={14} style={{ color: 'rgba(255,255,255,0.4)' }} className="animate-spin" />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
                Loading track...
              </p>
            </motion.div>
          )}

          {/* ─── State: No music yet ─── */}
          {showEmpty && (
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Music2 size={15} style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.3} />
              </div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', flex: 1, letterSpacing: '0.04em' }}>
                Add a YouTube playlist or video to soundtrack this journey
              </p>
              <motion.button
                onClick={onOpenAddMusic}
                whileHover={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: '0.6rem', letterSpacing: '0.18em',
                  color: 'rgba(255,255,255,0.4)', background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                  padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
                }}
                id="add-music-empty-btn"
              >
                <Plus size={11} strokeWidth={2} />
                ADD MUSIC
              </motion.button>
            </motion.div>
          )}

          {/* ─── State: Active player (track loaded or loading into player) ─── */}
          {showPlayer && (
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentTrack?.id ?? 'track-loading'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {/* Track info row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    overflow: 'hidden', flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {state.currentTrack?.thumbnail ? (
                      <img
                        src={state.currentTrack.thumbnail}
                        alt=""
                        onError={event => { event.currentTarget.style.display = 'none'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                    <Music2 size={13} style={{ color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.3} />
                    )}
                  </div>

                  {/* Title + Artist */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {state.isLoading && !state.currentTrack ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Loader2 size={10} style={{ color: 'rgba(255,255,255,0.3)' }} className="animate-spin" />
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                          Loading track...
                        </p>
                      </div>
                    ) : (
                      <p style={{
                        fontSize: '0.68rem', fontWeight: 500,
                        color: 'rgba(255,255,255,0.92)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                      }}>
                        {state.currentTrack?.title || 'Loading track...'}
                      </p>
                    )}
                    <p style={{
                      fontSize: '0.53rem', color: 'rgba(255,255,255,0.38)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 1,
                    }}>
                      {state.currentTrack?.author && state.currentTrack.author !== 'YouTube'
                        ? `${state.currentTrack.author} · YouTube`
                        : 'YouTube'}
                    </p>
                  </div>

                  {/* Playlist + Add music icons */}
                  <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <motion.button onClick={onOpenPlaylist} title="Playlist" id="open-playlist-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 3 }}
                      whileHover={{ color: 'rgba(255,255,255,0.75)' }}>
                      <List size={12} strokeWidth={1.8} />
                    </motion.button>
                    <motion.button onClick={onOpenAddMusic} title="Add Music" id="add-music-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 3 }}
                      whileHover={{ color: 'rgba(255,255,255,0.75)' }}>
                      <Plus size={12} strokeWidth={2} />
                    </motion.button>
                  </div>
                </div>

                {/* Controls row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Shuffle */}
                  <motion.button onClick={onToggleShuffle} title="Shuffle" id="shuffle-btn"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                      color: state.isShuffled ? 'rgba(200,180,140,0.9)' : 'rgba(255,255,255,0.25)',
                    }}
                    whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Shuffle size={11} strokeWidth={1.8} />
                  </motion.button>

                  {/* Prev */}
                  <motion.button onClick={onPrev} title="Previous" id="prev-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }} whileTap={{ scale: 0.88 }}>
                    <SkipBack size={15} strokeWidth={1.8} />
                  </motion.button>

                  {/* Play / Pause */}
                  <motion.button
                    onClick={state.needsUserGesture ? onPlay : onTogglePlay}
                    title={state.isPlaying ? 'Pause' : 'Play'}
                    id="play-pause-btn"
                    style={{
                      width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.13)', border: 'none',
                      color: 'rgba(255,255,255,0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    whileHover={{ background: 'rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {state.isLoading && !state.isReady ? (
                      <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                    ) : state.isPlaying ? (
                      <Pause size={14} strokeWidth={2} fill="currentColor" />
                    ) : (
                      <Play size={14} strokeWidth={2} fill="currentColor" style={{ marginLeft: 2 }} />
                    )}
                  </motion.button>

                  {/* Next */}
                  <motion.button onClick={onNext} title="Next" id="next-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }} whileTap={{ scale: 0.88 }}>
                    <SkipForward size={15} strokeWidth={1.8} />
                  </motion.button>

                  {/* Repeat */}
                  <motion.button onClick={onToggleRepeat} title="Repeat" id="repeat-btn"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 3,
                      color: state.repeatMode !== 'none' ? 'rgba(200,180,140,0.9)' : 'rgba(255,255,255,0.25)',
                    }}
                    whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                    {state.repeatMode === 'one'
                      ? <Repeat1 size={11} strokeWidth={1.8} />
                      : <Repeat size={11} strokeWidth={1.8} />}
                  </motion.button>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Time */}
                  <span style={{
                    fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </span>

                  {/* Volume */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    onMouseEnter={() => setShowVolume(true)}
                    onMouseLeave={() => setShowVolume(false)}
                  >
                    <motion.button onClick={onToggleMute} title="Mute" id="mute-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.28)' }}
                      whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                      {state.isMuted || state.volume === 0
                        ? <VolumeX size={11} strokeWidth={1.8} />
                        : <Volume2 size={11} strokeWidth={1.8} />}
                    </motion.button>
                    <AnimatePresence>
                      {showVolume && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 48, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <input
                            type="range" min="0" max="100"
                            value={state.isMuted ? 0 : state.volume}
                            onChange={e => onVolumeChange(Number(e.target.value))}
                            className="volume-slider" style={{ width: 44 }}
                            id="volume-slider"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Progress bar with time labels */}
                <div style={{ marginTop: 4 }}>
                  <div
                    ref={progressBarRef}
                    onClick={state.duration > 0 ? handleProgressClick : undefined}
                    className="progress-track"
                    style={{ cursor: state.duration > 0 ? 'pointer' : 'default' }}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="progress-thumb" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(state.currentTime)}
                    </span>
                    <span style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(state.duration)}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
