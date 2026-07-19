import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Link2, MessageCircle, RefreshCw, UserRound } from 'lucide-react';
import { leadsApi } from '../api/leads';
import { paymentsApi } from '../api/payments';
import ConfirmModal from '../components/ConfirmModal';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import { PAYMENT_STATUSES } from '../utils/constants';
import { formatDate } from '../utils/formatDate';
import { getLeadPhoneDisplay } from '../utils/formatPhone';
import ProductInterestBadge from '../components/ProductInterestBadge';
import { PRODUCT_OPTIONS } from '../utils/products';

export default function Payments() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', product_interest: '', q: '' });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const payload = await paymentsApi.list(nextFilters);
      setPayments(payload.payments || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePayment(id, body) {
    setError('');
    try {
      await paymentsApi.update(id, body);
      setPendingConfirm(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resendHotmart(payment) {
    setError('');
    try {
      await leadsApi.sendHotmartLink(payment.lead_id);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pagos</h1>
        <p className="mt-1 text-sm text-slate-500">Revision y confirmacion manual de pagos reportados.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-4 shadow-soft"
      >
        <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Buscar lead, telefono o provider" className="h-10 min-w-[260px] flex-1 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
          <option value="">Todos los estados</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select value={filters.product_interest} onChange={(event) => setFilters((current) => ({ ...current, product_interest: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
          <option value="">Todos los productos</option>
          {PRODUCT_OPTIONS.map((product) => <option key={product.value} value={product.value}>{product.label}</option>)}
        </select>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Filtrar</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <Th>Lead</Th>
                <Th>Telefono / WhatsApp ID</Th>
                <Th>Producto</Th>
                <Th>Estado</Th>
                <Th>Monto</Th>
                <Th>Moneda</Th>
                <Th>Provider</Th>
                <Th>Link</Th>
                <Th>Reportado</Th>
                <Th>Confirmado manual</Th>
                <Th>Fecha confirmacion</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">Cargando pagos...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">No hay pagos.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <Td>{payment.lead_name || 'Sin lead'}</Td>
                    <Td><PhoneCell payment={payment} /></Td>
                    <Td><ProductInterestBadge lead={payment} /></Td>
                    <Td><PaymentStatusBadge status={payment.status} /></Td>
                    <Td>{payment.amount ?? '-'}</Td>
                    <Td>{payment.currency || '-'}</Td>
                    <Td>{payment.provider || 'Hotmart'}</Td>
                    <Td>{payment.link ? <a href={payment.link} target="_blank" rel="noreferrer" className="font-bold text-brand-700">Abrir</a> : '-'}</Td>
                    <Td>{payment.reported_by_user ? 'si' : 'no'}</Td>
                    <Td>{payment.manually_confirmed ? 'si' : 'no'}</Td>
                    <Td>{formatDate(payment.confirmed_at)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <IconButton icon={CheckCircle2} label="Confirmar" onClick={() => setPendingConfirm(payment)} />
                        <IconButton icon={RefreshCw} label="Pendiente" onClick={() => updatePayment(payment.id, { status: 'pending' })} />
                        <IconButton icon={Link2} label="Hotmart" onClick={() => resendHotmart(payment)} />
                        <LinkButton icon={UserRound} label="Lead" to={`/leads/${payment.lead_id}`} />
                        <LinkButton icon={MessageCircle} label="Chat" to={`/conversations/${payment.lead_id}`} />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(pendingConfirm)}
        title="Confirmar pago"
        body="Esto actualizara payments.status, leads.payment_status, leads.lead_status y leads.funnel_stage."
        confirmLabel="Confirmar pago"
        tone="success"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => updatePayment(pendingConfirm.id, { status: 'confirmed' })}
      />
    </div>
  );
}

function Th({ children }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function PhoneCell({ payment }) {
  const phone = getLeadPhoneDisplay({
    phone: payment.lead_phone,
    whatsapp_id: payment.lead_whatsapp_id,
    whatsapp_lid: payment.lead_whatsapp_lid,
    display_phone: payment.lead_display_phone
  });

  return (
    <div>
      <div className="font-semibold text-slate-800">{phone.value}</div>
      {phone.helper ? <div className="mt-1 text-xs font-semibold text-slate-500">{phone.helper}</div> : null}
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
      <Icon size={15} /> {label}
    </button>
  );
}

function LinkButton({ icon: Icon, label, to }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
      <Icon size={15} /> {label}
    </Link>
  );
}
