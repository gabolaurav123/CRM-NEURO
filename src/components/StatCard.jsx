export default function StatCard({ label, value, helper, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-900 text-white',
    teal: 'bg-teal-600 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-600 text-white',
    emerald: 'bg-emerald-600 text-white',
    cyan: 'bg-cyan-700 text-white'
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value ?? 0}</p>
        </div>
        {Icon ? (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
