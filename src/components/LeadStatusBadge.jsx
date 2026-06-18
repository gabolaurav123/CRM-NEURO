const styles = {
  frio: 'bg-slate-100 text-slate-700 ring-slate-200',
  tibio: 'bg-amber-100 text-amber-800 ring-amber-200',
  caliente: 'bg-orange-100 text-orange-800 ring-orange-200',
  comprador: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  perdido: 'bg-neutral-200 text-neutral-800 ring-neutral-300'
};

export default function LeadStatusBadge({ status }) {
  return <Badge value={status || 'frio'} className={styles[status] || styles.frio} />;
}

function Badge({ value, className }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${className}`}>{value}</span>;
}
