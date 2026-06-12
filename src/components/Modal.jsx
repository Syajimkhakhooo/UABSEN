import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, title, description, children, onClose }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/24 p-2 backdrop-blur-[2px] sm:p-4 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="card relative flex max-h-[min(94dvh,94vh)] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border-slate-200/90 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.42)] md:max-h-[92vh] md:rounded-[18px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="shrink-0 border-b border-slate-200/80 px-4 pb-4 pt-3 md:px-5 md:pb-4 md:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink md:text-xl">{title}</h3>
              {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn-secondary shrink-0 !px-2.5 !py-2">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-5 md:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
