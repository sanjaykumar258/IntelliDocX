import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  isDeleting,
}: DeleteConfirmationModalProps) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isDeleting, onClose]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isDeleting && onClose()}
            style={{ position: 'fixed', inset: 0, zIndex: 99990 }}
            className="bg-black/50 backdrop-blur-sm"
          />

          {/* ── Modal Card ── */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99991,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key="delete-modal"
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 32 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ pointerEvents: 'auto', width: '100%', maxWidth: '420px' }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden"
            >
              {/* ── Header ── */}
              <div className="relative bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-slate-900 px-6 pt-6 pb-5 border-b border-rose-100/60 dark:border-slate-700/40">
                {/* Close button */}
                <button
                  onClick={() => !isDeleting && onClose()}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Delete Document?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  This action is permanent and cannot be undone.
                </p>
              </div>

              {/* ── Body ── */}
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 rounded-2xl px-4 py-3 mb-5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    You are about to permanently delete{' '}
                    <span className="font-bold text-slate-900 dark:text-white break-all">
                      "{title}"
                    </span>{' '}
                    from the secure vault.
                  </p>
                </div>

                {/* ── Actions ── */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Forever</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => !isDeleting && onClose()}
                    disabled={isDeleting}
                    className="w-full h-12 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Keep Document
                  </button>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Irreversible — Global Storage Purge Protocol
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Render into document.body via Portal to escape any transformed ancestors
  return createPortal(modal, document.body);
};
