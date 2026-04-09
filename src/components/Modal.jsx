import { X } from 'lucide-react';
import { useEffect } from 'react';

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/24 p-0 backdrop-blur-[2px] md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="card relative w-full max-w-2xl overflow-visible rounded-t-[22px] border-slate-200/90 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.42)] md:rounded-[18px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="border-b border-slate-200/80 px-4 pb-4 pt-3 md:px-5 md:pb-4 md:pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink md:text-xl">{title}</h3>
              {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn-secondary !px-2.5 !py-2">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="bg-slate-50/70 px-4 py-4 md:px-5 md:py-5">{children}</div>
      </div>
    </div>
  );
}
