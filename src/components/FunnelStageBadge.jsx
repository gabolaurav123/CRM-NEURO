const stageStyles = {
  inicio: 'bg-slate-100 text-slate-700 ring-slate-200',
  captacion: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  diagnostico: 'bg-blue-100 text-blue-800 ring-blue-200',
  landing_enviada: 'bg-teal-100 text-teal-800 ring-teal-200',
  video_visto: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  oferta_presentada: 'bg-amber-100 text-amber-800 ring-amber-200',
  objecion: 'bg-orange-100 text-orange-800 ring-orange-200',
  link_pago_enviado: 'bg-lime-100 text-lime-800 ring-lime-200',
  pago_reportado: 'bg-sky-100 text-sky-800 ring-sky-200',
  onboarding: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  pausado: 'bg-stone-200 text-stone-800 ring-stone-300',
  humano: 'bg-rose-100 text-rose-800 ring-rose-200',
  crisis: 'bg-red-100 text-red-800 ring-red-200'
};

export default function FunnelStageBadge({ stage }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${stageStyles[stage] || stageStyles.inicio}`}>
      {stage || 'inicio'}
    </span>
  );
}
