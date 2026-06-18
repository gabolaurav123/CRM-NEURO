import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CalendarClock, Send, UserRound } from 'lucide-react';
import { followupsApi } from '../api/followups';
import { formatDate } from '../utils/formatDate';
import { formatPhone } from '../utils/formatPhone';

const statuses = ['pending', 'sent', 'cancelled', 'failed'];

export default function FollowUps() {
  const [filters, setFilters] = useState({ status: '', type: '', date_from: '', date_to: '', q: '' });
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  async function updateFollowup(id, body) {
    setError('');
    try {
      await followupsApi.update(id, body);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function sendNow(id) {
    setError('');
    try {
      await followupsApi.sendNow(id);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function reschedule(id) {
    const value = window.prompt('Nueva fecha ISO o YYYY-MM-DD HH:mm');
    if (value) updateFollowup(id, { scheduled_for: value });
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-500">Mensajes pendientes, enviados y fallidos.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-3 xl:grid-cols-6"
      >
        <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Buscar lead, telefono o mensaje" className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none md:col-span-2" />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
          <option value="">Todos</option>
          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} placeholder="Tipo" className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Filtrar</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <Th>Lead</Th>
                <Th>Telefono</Th>
                <Th>Tipo</Th>
                <Th>Mensaje</Th>
                <Th>Programado para</Th>
                <Th>Enviado en</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Cargando follow-ups...</td></tr>
              ) : followups.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No hay follow-ups.</td></tr>
              ) : (
                followups.map((followup) => (
                  <tr key={followup.id} className="hover:bg-slate-50">
                    <Td>{followup.lead_name || 'Sin lead'}</Td>
                    <Td>{formatPhone(followup.lead_phone)}</Td>
                    <Td>{followup.type || '-'}</Td>
                    <Td><p className="max-w-[340px] whitespace-pre-wrap">{followup.message || '-'}</p></Td>
                    <Td>{formatDate(followup.scheduled_for)}</Td>
                    <Td>{formatDate(followup.sent_at)}</Td>
                    <Td><Status value={followup.status} /></Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <IconButton icon={Ban} label="Cancelar" onClick={() => updateFollowup(followup.id, { status: 'cancelled' })} />
                        <IconButton icon={CalendarClock} label="Reprogramar" onClick={() => reschedule(followup.id)} />
                        <IconButton icon={Send} label="Enviar ahora" onClick={() => sendNow(followup.id)} />
                        <Link to={`/leads/${followup.lead_id}`} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          <UserRound size={15} /> Lead
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

function Th({ children }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}

function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
      <Icon size={15} /> {label}
    </button>
  );
}
