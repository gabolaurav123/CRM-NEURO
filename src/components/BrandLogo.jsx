import { BrainCircuit } from 'lucide-react';

export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${compact ? 'h-10 w-10' : 'h-14 w-14'} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-950/20`}>
        <BrainCircuit size={compact ? 23 : 30} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className={`${compact ? 'text-sm' : 'text-lg'} font-black leading-tight text-ink`}>Gimnasio del Cerebro</p>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-700">CRM comercial</p>
      </div>
    </div>
  );
}
