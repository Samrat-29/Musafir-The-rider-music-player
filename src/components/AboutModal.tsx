import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Content */}
          <motion.div
            className="relative z-10 max-w-lg w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Close */}
            <motion.button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 cursor-pointer bg-transparent border-none outline-none"
              style={{ color: 'var(--color-text-secondary)' }}
              whileHover={{ color: '#f0ece6' }}
              id="about-close-btn"
            >
              <X size={18} strokeWidth={1.5} />
            </motion.button>

            <div className="text-center space-y-8">
              <motion.h2
                className="font-serif text-4xl md:text-5xl tracking-wide"
                style={{ color: 'var(--color-text-primary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                LADAKH.
              </motion.h2>

              <motion.div
                className="w-8 h-px mx-auto"
                style={{ background: 'var(--color-text-tertiary)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              />

              <motion.div
                className="space-y-4 text-sm md:text-base leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p>A small digital space for long roads,</p>
                <p>cold mountains and music.</p>
                <br />
                <p>Built around a journey through</p>
                <p>the high-altitude landscapes of Ladakh.</p>
              </motion.div>

              <motion.div
                className="w-8 h-px mx-auto"
                style={{ background: 'var(--color-text-tertiary)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              />

              <motion.p
                className="text-xs tracking-ultra uppercase"
                style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.3em' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                2026
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
