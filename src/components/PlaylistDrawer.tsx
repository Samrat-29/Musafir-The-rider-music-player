import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2 } from 'lucide-react';
import type { Track } from '../types/music';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentIndex: number;
  onTrackSelect: (index: number) => void;
}

export default function PlaylistDrawer({
  isOpen,
  onClose,
  playlist,
  currentIndex,
  onTrackSelect,
}: PlaylistDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm glass-strong flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3
                className="text-xs tracking-ultra uppercase"
                style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.3em' }}
              >
                PLAYLIST
              </h3>
              <motion.button
                onClick={onClose}
                className="p-2 cursor-pointer bg-transparent border-none outline-none"
                style={{ color: 'var(--color-text-secondary)' }}
                whileHover={{ color: '#f0ece6' }}
                id="drawer-close-btn"
              >
                <X size={16} strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Track Count */}
            <div className="px-6 py-3">
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                {playlist.length} {playlist.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {/* Tracks */}
            <div className="flex-1 overflow-y-auto">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                  <Music2 size={24} strokeWidth={1} style={{ color: 'var(--color-text-tertiary)' }} />
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                    No tracks loaded yet.
                    <br />
                    Add music to start your journey.
                  </p>
                </div>
              ) : (
                playlist.map((track, index) => (
                  <motion.div
                    key={`${track.id}-${index}`}
                    className={`playlist-item ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => onTrackSelect(index)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                  >
                    {/* Index */}
                    <span
                      className="playlist-item-index text-[11px] w-6 text-right flex-shrink-0 tabular-nums"
                      style={{
                        color: index === currentIndex
                          ? 'var(--color-accent)'
                          : 'var(--color-text-tertiary)',
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Thumbnail */}
                    <div
                      className="w-9 h-9 rounded overflow-hidden flex-shrink-0"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs truncate"
                        style={{
                          color: index === currentIndex
                            ? 'var(--color-text-primary)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {track.title || `Track ${index + 1}`}
                      </p>
                      {track.author && (
                        <p
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {track.author}
                        </p>
                      )}
                    </div>

                    {/* Playing indicator */}
                    {index === currentIndex && (
                      <motion.div
                        className="flex gap-[2px] items-end h-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-[2px] rounded-full"
                            style={{ background: 'var(--color-accent)' }}
                            animate={{
                              height: ['4px', '12px', '6px', '10px', '4px'],
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
