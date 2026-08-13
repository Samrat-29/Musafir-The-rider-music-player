import { motion } from 'framer-motion';

interface NavigationProps {
  onMusicClick: () => void;
  onAboutClick: () => void;
  onPlaylistClick: () => void;
  onlineCount: number | null;
}

export default function Navigation({ onMusicClick, onAboutClick, onPlaylistClick, onlineCount }: NavigationProps) {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 flex justify-end px-6 pt-6 md:px-10 md:pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
      <div className={`online-status ${onlineCount === null ? 'offline' : ''}`} aria-live="polite" aria-label={onlineCount === null ? 'Online visitor count unavailable' : `${onlineCount} visitors online`}>
        <span className="online-status-dot" aria-hidden="true" />
        <span>{onlineCount === null ? '— online' : `${onlineCount} online`}</span>
      </div>

      <motion.div
        className="musafir-logo"
        initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <img src="/musafir-logo.png" alt="मुसाफिर — THE RIDER" className="musafir-logo-image" />
      </motion.div>

      <div className="flex items-center gap-5 pt-2 md:gap-7" style={{ minWidth: '100px', justifyContent: 'flex-end' }}>
        {[
          { label: 'MUSIC', action: onMusicClick, id: 'nav-music' },
          { label: 'PLAYLIST', action: onPlaylistClick, id: 'nav-playlist' },
          { label: 'ABOUT', action: onAboutClick, id: 'nav-about' },
        ].map((item) => (
          <motion.button
            key={item.label}
            id={item.id}
            onClick={item.action}
            className="relative cursor-pointer border-none bg-transparent text-[9px] uppercase outline-none md:text-[10px]"
            style={{
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.22em',
              fontFamily: "'Manrope', 'Inter', sans-serif",
            }}
            whileHover={{ color: 'rgba(255,255,255,0.88)' }}
            transition={{ duration: 0.25 }}
          >
            {item.label}
            <motion.div
              className="absolute -bottom-1 left-0 right-0 h-px origin-left"
              style={{ background: 'rgba(255,255,255,0.25)' }}
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            />
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
}
