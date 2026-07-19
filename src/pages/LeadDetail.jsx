import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Link2, Pause, Play, Save, Send, Trash2, UserCheck, UserX } from 'lucide-react';
import { conversationsApi } from '../api/conversations';
import { leadsApi } from '../api/leads';
import ConfirmModal from '../components/ConfirmModal';
import FunnelStageBadge from '../components/FunnelStageBadge';
import LeadStatusBadge from '../components/LeadStatusBadge';
import MessageBubble from '../components/MessageBubble';
import PaymentStatusBadge from '../components/PaymentStatusBadge';
import { FUNNEL_STAGES, LEAD_STATUSES, PAYMENT_STATUSES } from '../utils/constants';
import { formatDate } from '../utils/formatDate';
import { formatLeadPhone, getLeadPhoneDisplay, stripWhatsappSuffix } from '../utils/formatPhone';
import { isUuid } from '../utils/ids';
import ProductInterestBadge from '../components/ProductInterestBadge';
import { PRODUCT_OPTIONS, getProductInterest, getProductLabel } from '../utils/products';

const editableKeys = ['name', 'phone', 'email', 'country', 'city', 'username', 'product_interest', 'main_pain', 'urgency', 'lead_score', 'lead_status', 'funnel_stage', 'main_objection', 'payment_status'];

export default function LeadDetail() {
  const { id } = useParams();
  const [payload, setPayload] = useState({ lead: null, messages: [], memory: null, payments: [], followups: [] });
  const [form, setForm] = useState({});
  const [manualMessage, setManualMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError('');
    if (!isUuid(id)) {
      setPayload({ lead: null, messages: [], memory: null, payments: [], followups: [] });
      setError('Error al cargar lead: ID invalido.');
      setLoading(false);
      return;
    }

    try {
      const data = await leadsApi.get(id);
      setPayload(data);
      setForm(Object.fromEntries(editableKeys.map((key) => [key, key === 'product_interest' ? getProductInterest(data.lead || {}) : data.lead?.[key] ?? ''])));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveLead() {
    setSaving(true);
    setError('');
    try {
      await leadsApi.update(id, form);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    setError('');
    try {
      await leadsApi.update(id, { notes: payload.lead.notes || '' });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function sendManualMessage(event) {
    event.preventDefault();
    const message = manualMessage.trim();
    if (!message) {
      setError('MESSAGE_REQUIRED');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await conversationsApi.sendMessage(id, message);
      setManualMessage('');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function requestAction(action) {
    if (['pauseBot', 'deleteMemory', 'markPaid'].includes(action)) {
      setPendingAction(action);
    } else {
      executeAction(action);
    }
  }

  async function executeAction(action) {
    setError('');
    try {
      await leadsApi[action](id);
      setPendingAction(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const lead = payload.lead;
  const phoneDisplay = getLeadPhoneDisplay(lead || {});
  const realPhone = phoneDisplay.kind === 'phone' ? phoneDisplay.value : 'Sin numero';
  const memoryExpiresAt = lead?.memory_expires_at || payload.memory?.expires_at;
  const memoryActive = memoryExpiresAt ? new Date(memoryExpiresAt).getTime() > Date.now() : false;
  const confirmCopy = useMemo(() => {
    if (pendingAction === 'pauseBot') return ['Pausar bot', 'Confirma que quieres pausar el bot para este lead.', 'Pausar bot', 'danger'];
    if (pendingAction === 'deleteMemory') return ['Borrar memoria temporal', 'Esta accion elimina la memoria temporal activa o vencida del lead.', 'Borrar memoria', 'danger'];
    return ['Confirmar pago', 'Esto marcara el pago como confirmado y movera el lead a onboarding.', 'Confirmar pago', 'success'];
  }, [pendingAction]);

  if (loading) return <div className="rounded-lg border border-line bg-white p-5 shadow-soft">Cargando lead...</div>;
  if (!lead) {
    return (
      <div className="space-y-5 pb-24 lg:pb-0">
        <Link to="/leads" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-ink">
          <ArrowLeft size={16} /> Volver a leads
        </Link>
        <div className="rounded-lg border border-line bg-white p-5 text-sm text-slate-600 shadow-soft">
          {error || 'Lead no encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/leads" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-ink">
            <ArrowLeft size={16} /> Volver a leads
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-ink">{lead?.name || 'Lead sin nombre'}</h1>
          <p className="mt-1 text-sm text-slate-500">{formatLeadPhone(lead || {})} | {lead?.email || 'Sin correo'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LeadStatusBadge status={lead?.lead_status} />
          <FunnelStageBadge stage={lead?.funnel_stage} />
          <PaymentStatusBadge status={lead?.payment_status} />
          <ProductInterestBadge lead={lead} />
        </div>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Section title="Datos principales">
            <InfoGrid
              items={[
                ['Nombre', lead?.name],
                ['Telefono real', realPhone],
                ['WhatsApp ID', stripWhatsappSuffix(lead?.whatsapp_id)],
                ['WhatsApp LID', stripWhatsappSuffix(lead?.whatsapp_lid)],
                ['Display phone', lead?.display_phone || formatLeadPhone(lead || {})],
                ['Correo', lead?.email],
                ['Pais', lead?.country],
                ['Ciudad', lead?.city],
                ['Usuario', lead?.username],
                ['Canal', lead?.channel],
                ['Palabra clave', lead?.source_keyword],
                ['Producto de interes', getProductLabel(getProductInterest(lead))],
                ['Fecha de ingreso', formatDate(lead?.created_at)],
                ['Ultimo contacto', formatDate(lead?.last_contact_at)]
              ]}
            />
          </Section>

          <Section title="Diagnostico">
            <InfoGrid
              items={[
                ['Dolor principal', lead?.main_pain],
                ['Respuesta emocional', lead?.emotional_response],
                ['Tiempo con el problema', lead?.problem_duration],
                ['Que intento antes', lead?.tried_before],
                ['Urgencia', lead?.urgency],
                ['Score', lead?.lead_score],
                ['Estado del lead', lead?.lead_status]
              ]}
            />
          </Section>

          <Section title="Embudo">
            <InfoGrid
              items={[
                ['Etapa actual', lead?.funnel_stage],
                ['Link Hotmart enviado', lead?.hotmart_link_sent ? 'si' : 'no'],
                ['Fecha envio link', formatDate(lead?.hotmart_link_sent_at)],
                ['Estado pago', lead?.payment_status],
                ['Objecion principal', lead?.main_objection]
              ]}
            />
          </Section>

          <Section title="Conversacion">
            <div className="max-h-[620px] space-y-3 overflow-y-auto rounded-lg bg-slate-100 p-4 scrollbar-thin">
              {payload.messages.length ? (
                payload.messages.map((message) => <MessageBubble key={message.id} message={message} />)
              ) : (
                <p className="text-sm text-slate-500">Aun no hay mensajes registrados para este lead.</p>
              )}
            </div>
            <form onSubmit={sendManualMessage} className="mt-4 flex gap-3">
              <textarea
                value={manualMessage}
                onChange={(event) => setManualMessage(event.target.value)}
                className="min-h-[88px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="Mensaje manual por WhatsApp"
              />
              <button type="submit" disabled={saving || !manualMessage.trim()} className="inline-flex h-[88px] items-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Send size={16} /> Enviar mensaje
              </button>
            </form>
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="Editar datos">
            <div className="grid gap-3">
              <TextInput label="Nombre" value={form.name} onChange={(value) => setFormValue('name', value, setForm)} />
              <TextInput label="Telefono" value={form.phone} onChange={(value) => setFormValue('phone', value, setForm)} />
              <TextInput label="Correo" value={form.email} onChange={(value) => setFormValue('email', value, setForm)} />
              <TextInput label="Pais" value={form.country} onChange={(value) => setFormValue('country', value, setForm)} />
              <TextInput label="Ciudad" value={form.city} onChange={(value) => setFormValue('city', value, setForm)} />
              <TextInput label="Usuario" value={form.username} onChange={(value) => setFormValue('username', value, setForm)} />
              <SelectInput label="Producto de interes" value={form.product_interest} options={PRODUCT_OPTIONS.map((option) => option.value)} labels={Object.fromEntries(PRODUCT_OPTIONS.map((option) => [option.value, option.label]))} onChange={(value) => setFormValue('product_interest', value, setForm)} />
              <TextInput label="Dolor principal" value={form.main_pain} onChange={(value) => setFormValue('main_pain', value, setForm)} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Urgencia" type="number" value={form.urgency} onChange={(value) => setFormValue('urgency', value, setForm)} />
                <TextInput label="Score" type="number" value={form.lead_score} onChange={(value) => setFormValue('lead_score', value, setForm)} />
              </div>
              <SelectInput label="Estado" value={form.lead_status} options={LEAD_STATUSES} onChange={(value) => setFormValue('lead_status', value, setForm)} />
              <SelectInput label="Etapa" value={form.funnel_stage} options={FUNNEL_STAGES} onChange={(value) => setFormValue('funnel_stage', value, setForm)} />
              <SelectInput label="Pago" value={form.payment_status} options={PAYMENT_STATUSES} onChange={(value) => setFormValue('payment_status', value, setForm)} />
              <TextInput label="Objecion" value={form.main_objection} onChange={(value) => setFormValue('main_objection', value, setForm)} />
              <button onClick={saveLead} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
                <Save size={16} /> Guardar datos
              </button>
            </div>
          </Section>

          <Section title="Control del bot">
            <InfoGrid
              items={[
                ['Bot pausado', lead?.bot_paused ? 'si' : 'no'],
                ['Human takeover', lead?.human_takeover ? 'si' : 'no'],
                ['Consentimiento memoria 24h', lead?.consent_24h ? 'si' : 'no'],
                ['Expiracion memoria', formatDate(memoryExpiresAt)],
                ['Memoria', memoryActive ? 'activa' : 'vencida o sin memoria']
              ]}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton icon={lead?.bot_paused ? Play : Pause} label={lead?.bot_paused ? 'Reactivar bot' : 'Pausar bot'} onClick={() => requestAction(lead?.bot_paused ? 'resumeBot' : 'pauseBot')} />
              <ActionButton icon={lead?.human_takeover ? UserX : UserCheck} label={lead?.human_takeover ? 'Liberar control' : 'Tomar control'} onClick={() => requestAction(lead?.human_takeover ? 'releaseTakeover' : 'takeover')} />
              <ActionButton icon={Link2} label="Reenviar Hotmart" onClick={() => requestAction('sendHotmartLink')} />
              <ActionButton icon={Trash2} label="Borrar memoria" onClick={() => requestAction('deleteMemory')} />
            </div>
          </Section>

          <Section title="Notas">
            <textarea
              value={lead?.notes || ''}
              onChange={(event) => setPayload((current) => ({ ...current, lead: { ...current.lead, notes: event.target.value } }))}
              className="min-h-[180px] w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button onClick={saveNotes} disabled={saving} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
              <Save size={16} /> Guardar notas
            </button>
          </Section>
        </aside>
      </div>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={confirmCopy[0]}
        body={confirmCopy[1]}
        confirmLabel={confirmCopy[2]}
        tone={confirmCopy[3]}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => executeAction(pendingAction)}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({ items }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-slate-50 p-3 ring-1 ring-line">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
          <dd className="mt-1 break-words text-sm font-bold text-slate-800">{value || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextInput({ label, value, onChange, type = 'text' }) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none" />
    </label>
  );
}

function SelectInput({ label, value, options, labels = {}, onChange }) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
      <Icon size={16} /> {label}
    </button>
  );
}

function setFormValue(key, value, setForm) {
  setForm((current) => ({ ...current, [key]: value }));
}
