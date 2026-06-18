const paymentStyles = {
  pendiente: 'bg-amber-100 text-amber-800 ring-amber-200',
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  reported: 'bg-blue-100 text-blue-800 ring-blue-200',
  reportado: 'bg-blue-100 text-blue-800 ring-blue-200',
  pagado: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  confirmed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  failed: 'bg-red-100 text-red-800 ring-red-200',
  cancelled: 'bg-neutral-200 text-neutral-800 ring-neutral-300'
};

export default function PaymentStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${paymentStyles[status] || paymentStyles.pendiente}`}>
      {status || 'pendiente'}
    </span>
  );
}
