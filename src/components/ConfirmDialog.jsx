import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  tone = 'danger',
  confirming = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} onClose={confirming ? () => {} : onClose} title={title} description={description}>
      <div className="grid gap-5">
        <div
          className={[
            'flex items-start gap-3 rounded-[18px] border px-4 py-4',
            tone === 'danger'
              ? 'border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,0.98))]'
              : 'border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))]',
          ]
            .join(' ')
            .trim()}
        >
          <div
            className={[
              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
              tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600',
            ]
              .join(' ')
              .trim()}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-ink">Konfirmasi tindakan</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Tindakan ini akan dijalankan segera setelah Anda menekan tombol konfirmasi.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={confirming}>
            {cancelText}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
