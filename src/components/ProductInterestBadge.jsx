import { getProductInterest, getProductLabel } from '../utils/products';

const tones = {
  neurotrauma: 'bg-violet-100 text-violet-800 ring-violet-200',
  holograficas: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  ambos: 'bg-amber-100 text-amber-800 ring-amber-200',
  sin_definir: 'bg-slate-100 text-slate-600 ring-slate-200'
};

export default function ProductInterestBadge({ value, lead }) {
  const product = lead ? getProductInterest(lead) : value || 'sin_definir';
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ring-inset ${tones[product] || tones.sin_definir}`}>
      {getProductLabel(product)}
    </span>
  );
}
