import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Loader2 } from 'lucide-react';
import { actionLabel, parseMusicUrl, type ParsedMusicUrl } from '../utils/music';

interface PlaylistModalProps { isOpen: boolean; onClose: () => void; onLoad: (resource: ParsedMusicUrl) => Promise<void>; }

export default function PlaylistModal({ isOpen, onClose, onLoad }: PlaylistModalProps) {
  const [url, setUrl] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const parsed = useMemo(() => parseMusicUrl(url), [url]);
  const handleLoad = async () => {
    setError('');
    if (!parsed) return setError('Unsupported or invalid music URL.');
    setLoading(true);
    try { await onLoad(parsed); setUrl(''); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Music could not be loaded.'); }
    finally { setLoading(false); }
  };
  return <AnimatePresence>{isOpen && <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
    <motion.div className="add-music-backdrop absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
    <motion.div className="add-music-panel glass-strong relative z-10 w-full max-w-lg rounded-2xl p-8 md:p-10" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.5 }}>
      <motion.button onClick={onClose} className="absolute top-5 right-5 p-2 cursor-pointer bg-transparent border-none outline-none" style={{ color: 'var(--color-text-secondary)' }} whileHover={{ color: '#f0ece6' }} id="modal-close-btn"><X size={16} strokeWidth={1.5} /></motion.button>
      <div className="mb-8"><h3 className="text-xs tracking-ultra uppercase mb-2" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.3em' }}>ADD MUSIC</h3><p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Paste a YouTube video or playlist URL</p></div>
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--color-border)' }}>
        <Link2 size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        <input type="text" value={url} onChange={event => { setUrl(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter' && url.trim()) void handleLoad(); }} placeholder="YouTube video or playlist URL..." className="flex-1 bg-transparent border-none outline-none text-sm" style={{ color: 'var(--color-text-primary)' }} autoFocus id="playlist-url-input" />
      </div>
      {error && <motion.p className="text-[11px] mb-4" style={{ color: 'rgba(230, 140, 120, 0.8)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}
      <motion.button onClick={() => void handleLoad()} disabled={!url.trim() || loading} className="w-full py-3 rounded-xl text-xs tracking-widest-custom uppercase cursor-pointer border-none outline-none" style={{ background: url.trim() ? 'rgba(240, 236, 230, 0.08)' : 'rgba(240, 236, 230, 0.03)', color: url.trim() ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', letterSpacing: '0.2em', border: '1px solid var(--color-border)' }} whileTap={url.trim() ? { scale: 0.98 } : undefined} id="load-playlist-btn">
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" />LOADING...</span> : actionLabel(parsed)}
      </motion.button>
      <div className="mt-6 space-y-1"><p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Supported formats:</p>{['YouTube video URL', 'YouTube playlist URL'].map(format => <p key={format} className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>• {format}</p>)}</div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
