import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, List, Plus,
  Shuffle, Repeat, Repeat1, Music2, AlertCircle,
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
  const progressRef = useRef<HTMLDivElement>(null);
  const [showVolume, setShowVolume] = useState(false);
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !state.duration) return;
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * state.duration);
  }, [state.duration, onSeek]);

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
        background: 'rgba(8, 8, 8, 0.76)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        boxShadow: '0 16px 55px rgba(0,0,0,0.58)',
        overflow: 'hidden',
      }}>

        {/* ── Progress bar — top edge ── */}
        <div
          ref={progressRef}
          onClick={state.duration > 0 ? handleProgressClick : undefined}
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.08)',
            cursor: state.duration > 0 ? 'pointer' : 'default',
            position: 'relative',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.65)',
              borderRadius: 2,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '14px 16px 14px' }}>

          {/* ─── State: Error ─── */}
          {state.error && (
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

          {/* ─── State: Loading ─── */}
          {!state.error && state.isLoading && !state.currentTrack && (
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <motion.div
                  style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'transparent' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
                LOADING PLAYLIST...
              </p>
            </motion.div>
          )}

          {/* ─── State: Needs user gesture (autoplay blocked) ─── */}
          {!state.error && !state.isLoading && state.needsUserGesture && !state.currentTrack && (
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Music2 size={15} style={{ color: 'rgba(255,255,255,0.3)' }} strokeWidth={1.3} />
              </div>
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', flex: 1 }}>
                Playlist loaded
              </p>
              <motion.button
                onClick={onPlay}
                whileHover={{ background: 'rgba(255,255,255,0.18)' }}
                whileTap={{ scale: 0.94 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.62rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                }}
              >
                <Play size={11} fill="currentColor" strokeWidth={0} />
                PLAY JOURNEY
              </motion.button>
              <button onClick={onOpenAddMusic} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                <Plus size={14} strokeWidth={1.8} />
              </button>
            </motion.div>
          )}

          {/* ─── State: No music yet ─── */}
          {!state.error && !state.isLoading && !state.needsUserGesture && !state.hasLoaded && (
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

          {/* ─── State: Active playback ─── */}
          {!state.error && (state.currentTrack || (state.hasLoaded && state.isLoading && !!state.currentTrack)) && (
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentTrack?.id ?? 'track'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                {/* Track info row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    overflow: 'hidden', flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}>
                    {state.currentTrack?.thumbnail && (
                      <img
                        src={state.currentTrack.thumbnail}
                        alt=""
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                  </div>

                  {/* Title + Artist */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.78rem', fontWeight: 500,
                      color: 'rgba(255,255,255,0.92)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      lineHeight: 1.3,
                    }}>
                      {state.currentTrack?.title || 'Loading...'}
                    </p>
                    <p style={{
                      fontSize: '0.62rem', color: 'rgba(255,255,255,0.38)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>
                      {state.currentTrack?.author || 'YouTube'} · YouTube
                    </p>
                  </div>

                  {/* Playlist + Add music icons */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {state.needsUserGesture && (
                      <motion.button onClick={onPlay} title="Enable sound" id="enable-sound-btn"
                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '5px 8px', borderRadius: 7, fontSize: '0.56rem', letterSpacing: '0.11em' }}
                        whileHover={{ background: 'rgba(255,255,255,0.18)' }}>
                        PLAY JOURNEY
                      </motion.button>
                    )}
                    <motion.button onClick={onOpenPlaylist} title="Playlist" id="open-playlist-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 6 }}
                      whileHover={{ color: 'rgba(255,255,255,0.75)' }}>
                      <List size={14} strokeWidth={1.8} />
                    </motion.button>
                    <motion.button onClick={onOpenAddMusic} title="Add Music" id="add-music-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 6 }}
                      whileHover={{ color: 'rgba(255,255,255,0.75)' }}>
                      <Plus size={14} strokeWidth={2} />
                    </motion.button>
                  </div>
                </div>

                {/* Controls row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {/* Shuffle */}
                  <motion.button onClick={onToggleShuffle} title="Shuffle" id="shuffle-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      color: state.isShuffled ? 'rgba(200,180,140,0.9)' : 'rgba(255,255,255,0.25)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Shuffle size={13} strokeWidth={1.8} />
                  </motion.button>

                  {/* Prev */}
                  <motion.button onClick={onPrev} title="Previous" id="prev-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }} whileTap={{ scale: 0.88 }}>
                    <SkipBack size={17} strokeWidth={1.8} />
                  </motion.button>

                  {/* Play / Pause */}
                  <motion.button onClick={onTogglePlay} title={state.isPlaying ? 'Pause' : 'Play'} id="play-pause-btn"
                    style={{
                      width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.13)', border: 'none',
                      color: 'rgba(255,255,255,0.95)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    whileHover={{ background: 'rgba(255,255,255,0.2)' }} whileTap={{ scale: 0.9 }}>
                    {state.isPlaying
                      ? <Pause size={16} strokeWidth={2} fill="currentColor" />
                      : <Play size={16} strokeWidth={2} fill="currentColor" style={{ marginLeft: 2 }} />
                    }
                  </motion.button>

                  {/* Next */}
                  <motion.button onClick={onNext} title="Next" id="next-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.9)' }} whileTap={{ scale: 0.88 }}>
                    <SkipForward size={17} strokeWidth={1.8} />
                  </motion.button>

                  {/* Repeat */}
                  <motion.button onClick={onToggleRepeat} title="Repeat" id="repeat-btn"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                      color: state.repeatMode !== 'none' ? 'rgba(200,180,140,0.9)' : 'rgba(255,255,255,0.25)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                    {state.repeatMode === 'one'
                      ? <Repeat1 size={13} strokeWidth={1.8} />
                      : <Repeat size={13} strokeWidth={1.8} />}
                  </motion.button>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Time */}
                  <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                  </span>

                  {/* Volume */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}
                    onMouseEnter={() => setShowVolume(true)}
                    onMouseLeave={() => setShowVolume(false)}>
                    <motion.button onClick={onToggleMute} title="Mute" id="mute-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                        color: 'rgba(255,255,255,0.28)' }}
                      whileHover={{ color: 'rgba(255,255,255,0.7)' }}>
                      {state.isMuted || state.volume === 0
                        ? <VolumeX size={13} strokeWidth={1.8} />
                        : <Volume2 size={13} strokeWidth={1.8} />}
                    </motion.button>
                    <AnimatePresence>
                      {showVolume && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 60, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}>
                          <input
                            type="range" min="0" max="100"
                            value={state.isMuted ? 0 : state.volume}
                            onChange={e => onVolumeChange(Number(e.target.value))}
                            className="volume-slider" style={{ width: 56 }}
                            id="volume-slider" />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
