import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface VideoBackgroundProps {
  onLoaded: () => void;
}

export default function VideoBackground({ onLoaded }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsLoaded(true);
      onLoaded();
    };

    video.addEventListener('canplaythrough', handleCanPlay);
    // If already loaded
    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      video.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [onLoaded]);

  return (
    <motion.div
      className="video-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src="/ladakh-ride.mp4"
      />
      <div className="video-overlay" />
    </motion.div>
  );
}
