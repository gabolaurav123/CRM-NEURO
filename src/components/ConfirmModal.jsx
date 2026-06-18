export default function ConfirmModal({ open, title, body, confirmLabel = 'Confirmar', tone = 'dark', onConfirm, onCancel }) {
  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700'
      : tone === 'success'
        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
        : 'bg-ink text-white hover:bg-slate-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onCancel}>
            Cancelar
          </button>
          <button className={`rounded-lg px-4 py-2 text-sm font-bold ${confirmClass}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
