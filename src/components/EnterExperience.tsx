import { motion } from 'framer-motion';

interface EnterExperienceProps {
  onEnter: () => void;
  isVideoLoaded: boolean;
}

export default function EnterExperience({ onEnter, isVideoLoaded }: EnterExperienceProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50"
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Very subtle vignette — does NOT block the rider */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 65%, rgba(0,0,0,0.32) 100%)',
        }}
      />

      {/* Enter button — anchored near bottom-center, above the rider area */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: '10%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVideoLoaded ? 1 : 0.25 }}
        transition={{ duration: 0.9, delay: 1.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.button
          onClick={onEnter}
          disabled={!isVideoLoaded}
          className="relative flex items-center gap-3 px-8 py-3 text-[10px] tracking-[0.32em] uppercase cursor-pointer bg-transparent border-none outline-none"
          style={{ color: 'rgba(255,255,255,0.62)' }}
          whileHover={{ color: 'rgba(255,255,255,0.92)' }}
          transition={{ duration: 0.3 }}
          id="enter-experience-btn"
        >
          {isVideoLoaded ? (
            <>
              ENTER EXPERIENCE
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>LOADING...</span>
          )}

          {/* Underline on hover */}
          <motion.div
            className="absolute bottom-2 left-8 right-8 h-px origin-left"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
