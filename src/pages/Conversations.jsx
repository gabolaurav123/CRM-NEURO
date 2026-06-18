import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Link2, Pause, Play, Send, UserCheck, UserX } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { leadsApi } from '../api/leads';
import ConfirmModal from '../components/ConfirmModal';
import LeadStatusBadge from '../components/LeadStatusBadge';
import MessageBubble from '../components/MessageBubble';
import { formatDate } from '../utils/formatDate';
import { formatLeadPhone, getLeadPhoneDisplay } from '../utils/formatPhone';
import { isUuid } from '../utils/ids';

export default function Conversations() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState({ lead: null, messages: [] });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (leadId) loadConversation(leadId);
  }, [leadId]);

  async function loadList(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const payload = await conversationsApi.list(nextFilters);
      setConversations(payload.conversations || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(id) {
    setError('');
    if (!isUuid(id)) {
      setSelected({ lead: null, messages: [] });
      setError('Error al cargar conversacion: ID invalido.');
      return;
    }

    try {
      const payload = await conversationsApi.get(id);
      setSelected(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim() || !leadId) return;
    if (!isUuid(leadId)) {
      setError('Error al enviar mensaje: ID invalido.');
      return;
    }
    setError('');
    try {
      await conversationsApi.sendMessage(leadId, message.trim());
      setMessage('');
      await loadConversation(leadId);
      await loadList();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function action(name) {
    if (!selected.lead) return;
    setError('');
    try {
      await leadsApi[name](selected.lead.id);
      setPendingAction(null);
      await loadConversation(selected.lead.id);
      await loadList();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">Conversaciones</h1>
        <p className="mt-1 text-sm text-slate-500">Historial, control manual y acciones de seguimiento.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="rounded-lg border border-line bg-white shadow-soft">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadList();
            }}
            className="border-b border-line p-4"
          >
            <div className="grid gap-3">
              <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Buscar lead, telefono o WhatsApp ID" className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
                <option value="">Todas</option>
                <option value="active">Activas</option>
                <option value="expired">Vencidas</option>
                <option value="human">Con humano</option>
                <option value="bot_paused">Bot pausado</option>
                <option value="unanswered">No respondidas</option>
              </select>
              <button className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Filtrar</button>
            </div>
          </form>

          <div className="max-h-[720px] overflow-y-auto scrollbar-thin">
            {loading ? <p className="p-4 text-sm text-slate-500">Cargando conversaciones...</p> : null}
            {conversations.map((item) => (
              <button
                key={item.lead_id}
                onClick={() => navigate(`/conversations/${item.lead_id}`)}
                className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-slate-50 ${String(leadId) === String(item.lead_id) ? 'bg-slate-100' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{item.name || 'Sin nombre'}</p>
                    <PhoneText lead={item} />
                  </div>
                  <LeadStatusBadge status={item.lead_status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.last_message || 'Sin mensajes'}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.last_activity_at)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white shadow-soft">
          {selected.lead ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">{selected.lead.name || 'Sin nombre'}</h2>
                  <p className="text-sm text-slate-500">{formatLeadPhone(selected.lead)} | {selected.lead.email || 'Sin correo'}</p>
                  <Link to={`/leads/${selected.lead.id}`} className="mt-2 inline-block text-sm font-bold text-brand-700 hover:text-brand-600">
                    Abrir lead
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionIcon icon={selected.lead.bot_paused ? Play : Pause} label={selected.lead.bot_paused ? 'Reactivar' : 'Pausar'} onClick={() => (selected.lead.bot_paused ? action('resumeBot') : setPendingAction('pauseBot'))} />
                  <ActionIcon icon={selected.lead.human_takeover ? UserX : UserCheck} label={selected.lead.human_takeover ? 'Liberar' : 'Tomar'} onClick={() => action(selected.lead.human_takeover ? 'releaseTakeover' : 'takeover')} />
                  <ActionIcon icon={Link2} label="Hotmart" onClick={() => action('sendHotmartLink')} />
                  <ActionIcon icon={CreditCard} label="Pago" onClick={() => setPendingAction('markPaid')} />
                </div>
              </div>

              <div className="max-h-[610px] space-y-3 overflow-y-auto bg-slate-100 p-4 scrollbar-thin">
                {selected.messages.length ? selected.messages.map((item) => <MessageBubble key={item.id} message={item} />) : <p className="text-sm text-slate-500">Aun no hay mensajes registrados para este lead.</p>}
              </div>

              <form onSubmit={sendMessage} className="flex gap-3 border-t border-line p-4">
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-[86px] flex-1 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Mensaje manual por WhatsApp" />
                <button type="submit" disabled={!message.trim()} className="inline-flex h-[86px] items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  <Send size={16} /> Enviar mensaje
                </button>
              </form>
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center p-6 text-center text-sm text-slate-500">Selecciona una conversacion para ver el historial.</div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction === 'markPaid' ? 'Confirmar pago' : 'Pausar bot'}
        body={pendingAction === 'markPaid' ? 'Esto marcara el pago como confirmado y movera el lead a onboarding.' : 'Confirma que quieres pausar el bot para este lead.'}
        confirmLabel={pendingAction === 'markPaid' ? 'Confirmar pago' : 'Pausar bot'}
        tone={pendingAction === 'markPaid' ? 'success' : 'danger'}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => action(pendingAction)}
      />
    </div>
  );
}

function ActionIcon({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
      <Icon size={16} /> {label}
    </button>
  );
}

function PhoneText({ lead }) {
  const phone = getLeadPhoneDisplay(lead);
  return (
    <div>
      <p className="text-xs text-slate-500">{phone.value}</p>
      {phone.helper ? <p className="text-[11px] font-semibold text-slate-400">{phone.helper}</p> : null}
    </div>
  );
}
