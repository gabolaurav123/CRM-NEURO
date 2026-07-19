import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, CalendarClock, Pencil, Send, UserRound, X } from 'lucide-react';
import { followupsApi } from '../api/followups';
import { formatDate } from '../utils/formatDate';
import { getLeadPhoneDisplay } from '../utils/formatPhone';
import ProductInterestBadge from '../components/ProductInterestBadge';
import { PRODUCT_OPTIONS } from '../utils/products';

const statuses = ['pending', 'sent', 'cancelled', 'failed'];

export default function FollowUps() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', product_interest: '', type: '', date_from: '', date_to: '', q: '' });
  const [followups, setFollowups] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ message: '', scheduled_at: '', type: '', status: 'pending' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const payload = await followupsApi.list(nextFilters);
      setFollowups(payload.followups || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateFollowup(id, body, successMessage = '') {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await followupsApi.update(id, body);
      setEditing(null);
      if (successMessage) setSuccess(successMessage);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing) return;

    await updateFollowup(
      editing.id,
      {
        message: form.message,
        scheduled_at: fromDatetimeLocal(form.scheduled_at),
        type: form.type,
        status: form.status
      },
      'Follow-up actualizado correctamente.'
    );
  }

  async function sendNow(id) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await followupsApi.sendNow(id);
      setSuccess('Follow-up enviado correctamente.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function openEditor(followup) {
    setEditing(followup);
    setForm({
      message: followup.message || '',
      scheduled_at: toDatetimeLocal(followup.scheduled_at || followup.scheduled_for),
      type: followup.type || '',
      status: followup.status || 'pending'
    });
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-500">Mensajes pendientes, enviados y fallidos.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6"
      >
        <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Buscar lead, telefono, WhatsApp ID o mensaje" className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none md:col-span-2" />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
          <option value="">Todos</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <select value={filters.product_interest} onChange={(event) => setFilters((current) => ({ ...current, product_interest: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
          <option value="">Todos los productos</option>
          {PRODUCT_OPTIONS.map((product) => <option key={product.value} value={product.value}>{product.label}</option>)}
        </select>
        <input value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} placeholder="Tipo" className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Filtrar</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <colgroup>
              <col style={{ width: 170 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 160 }} />
              <col />
              <col style={{ width: 160 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 430 }} />
            </colgroup>
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <Th>Lead</Th>
                <Th>Telefono / WhatsApp ID</Th>
                <Th>Producto</Th>
                <Th>Tipo</Th>
                <Th>Mensaje</Th>
                <Th>Programado para</Th>
                <Th>Enviado en</Th>
                <Th>Estado</Th>
                <Th className="sticky right-0 z-20 w-[430px] min-w-[430px] bg-slate-100">Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Cargando follow-ups...</td></tr>
              ) : followups.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No hay follow-ups.</td></tr>
              ) : (
                followups.map((followup) => (
                  <tr key={followup.id} className="hover:bg-slate-50">
                    <Td>{followup.lead_name || 'Sin lead'}</Td>
                    <Td><PhoneCell followup={followup} /></Td>
                    <Td><ProductInterestBadge lead={followup} /></Td>
                    <Td>{formatFollowupType(followup.type)}</Td>
                    <Td>
                      <div className="max-w-[430px]">
                        <p className="whitespace-pre-wrap">{followup.message || '-'}</p>
                        <button type="button" onClick={() => openEditor(followup)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          <Pencil size={14} /> Editar mensaje
                        </button>
                      </div>
                    </Td>
                    <Td>{formatDate(followup.scheduled_at || followup.scheduled_for)}</Td>
                    <Td>{formatDate(followup.sent_at)}</Td>
                    <Td><Status value={followup.status} /></Td>
                    <Td className="sticky right-0 z-10 w-[430px] min-w-[430px] bg-white shadow-[-12px_0_16px_-18px_rgba(15,23,42,0.55)]">
                      <div className="grid w-[398px] grid-cols-2 gap-2">
                        <IconButton icon={Pencil} label="Editar mensaje" onClick={() => openEditor(followup)} disabled={saving} />
                        <IconButton icon={CalendarClock} label="Reprogramar" onClick={() => openEditor(followup)} disabled={saving} />
                        <IconButton icon={Send} label="Enviar ahora" onClick={() => sendNow(followup.id)} disabled={saving || followup.status === 'sent'} />
                        <IconButton icon={Ban} label="Cancelar" onClick={() => updateFollowup(followup.id, { status: 'cancelled' }, 'Follow-up cancelado.')} disabled={saving || followup.status === 'cancelled'} />
                        <Link to={`/leads/${followup.lead_id}`} className="inline-flex h-9 items-center justify-start gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          <UserRound size={15} /> Abrir lead
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Editar follow-up</h2>
                <p className="mt-1 text-sm text-slate-500">{editing.lead_name || 'Sin lead'}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line bg-white p-2 text-slate-600 hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-sm font-bold text-slate-700">Mensaje</span>
                <textarea value={form.message} onChange={(event) => setFormValue('message', event.target.value, setForm)} className="mt-2 min-h-[180px] w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label>
                  <span className="text-sm font-bold text-slate-700">Fecha/hora programada</span>
                  <input type="datetime-local" value={form.scheduled_at} onChange={(event) => setFormValue('scheduled_at', event.target.value, setForm)} className="mt-2 h-11 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Tipo</span>
                  <input value={form.type} onChange={(event) => setFormValue('type', event.target.value, setForm)} className="mt-2 h-11 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none focus:border-brand-500" />
                </label>
                <label>
                  <span className="text-sm font-bold text-slate-700">Estado</span>
                  <select value={form.status} onChange={(event) => setFormValue('status', event.target.value, setForm)} className="mt-2 h-11 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none focus:border-brand-500">
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function PhoneCell({ followup }) {
  const phone = getLeadPhoneDisplay({
    phone: followup.lead_phone,
    whatsapp_id: followup.lead_whatsapp_id,
    whatsapp_lid: followup.lead_whatsapp_lid,
    display_phone: followup.lead_display_phone
  });

  return (
    <div>
      <div className="font-semibold text-slate-800">{phone.value}</div>
      {phone.helper ? <div className="mt-1 text-xs font-semibold text-slate-500">{phone.helper}</div> : null}
    </div>
  );
}

function Status({ value }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 ring-amber-200',
    sent: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    cancelled: 'bg-neutral-200 text-neutral-800 ring-neutral-300',
    failed: 'bg-red-100 text-red-800 ring-red-200'
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[value] || styles.pending}`}>{value || 'pending'}</span>;
}

function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-bold ${className}`}>{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function IconButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-9 min-w-0 items-center justify-start gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
      <Icon size={15} className="shrink-0" /> <span className="truncate">{label}</span>
    </button>
  );
}

function formatFollowupType(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (/landing|video|vsl/i.test(text)) return 'seguimiento_hotmart';
  return text;
}

function setFormValue(key, value, setForm) {
  setForm((current) => ({ ...current, [key]: value }));
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
