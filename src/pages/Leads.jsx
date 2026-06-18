import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import { leadsApi } from '../api/leads';
import ConfirmModal from '../components/ConfirmModal';
import LeadTable from '../components/LeadTable';
import { FUNNEL_STAGES, LEAD_STATUSES, PAYMENT_STATUSES } from '../utils/constants';
import { formatLeadPhone, formatPhone, isRealPhone, stripWhatsappSuffix } from '../utils/formatPhone';

const initialFilters = {
  q: '',
  name: '',
  phone: '',
  email: '',
  username: '',
  lead_status: '',
  funnel_stage: '',
  main_pain: '',
  payment_status: '',
  hotmart_link_sent: '',
  bot_paused: '',
  human_takeover: '',
  date_from: '',
  date_to: ''
};

export default function Leads() {
  const [filters, setFilters] = useState(initialFilters);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load(nextFilters = filters) {
    setLoading(true);
    setError('');
    try {
      const payload = await leadsApi.list({ ...nextFilters, limit: 200 });
      setLeads(payload.leads || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function submitFilters(event) {
    event.preventDefault();
    await load(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    load(initialFilters);
  }

  function requestAction(action, lead) {
    const requiresConfirm = ['pauseBot', 'deleteMemory', 'markPaid'].includes(action);
    if (requiresConfirm) {
      setPendingAction({ action, lead });
    } else {
      executeAction(action, lead);
    }
  }

  async function executeAction(action, lead) {
    setError('');
    try {
      await leadsApi[action](lead.id);
      setPendingAction(null);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const confirmCopy = useMemo(() => {
    if (!pendingAction) return null;
    if (pendingAction.action === 'pauseBot') {
      return {
        title: 'Pausar bot',
        body: `Vas a pausar el bot para ${pendingAction.lead.name || formatLeadPhone(pendingAction.lead) || 'este lead'}.`,
        label: 'Pausar bot',
        tone: 'danger'
      };
    }
    if (pendingAction.action === 'deleteMemory') {
      return {
        title: 'Borrar memoria temporal',
        body: 'Esta accion elimina la memoria temporal asociada al lead.',
        label: 'Borrar memoria',
        tone: 'danger'
      };
    }
    return {
      title: 'Confirmar pago',
      body: 'Esto marcara el pago como confirmado, el lead como comprador y la etapa como onboarding.',
      label: 'Confirmar pago',
      tone: 'success'
    };
  }, [pendingAction]);

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">Busqueda, segmentacion y acciones operativas.</p>
        </div>
        <button onClick={() => exportCsv(leads)} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <form onSubmit={submitFilters} className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Filter size={17} /> Filtros
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input icon={Search} label="Buscar" value={filters.q} onChange={(value) => updateFilter('q', value)} />
          <Input label="Nombre" value={filters.name} onChange={(value) => updateFilter('name', value)} />
          <Input label="Telefono" value={filters.phone} onChange={(value) => updateFilter('phone', value)} />
          <Input label="Correo" value={filters.email} onChange={(value) => updateFilter('email', value)} />
          <Input label="Usuario" value={filters.username} onChange={(value) => updateFilter('username', value)} />
          <Input label="Dolor" value={filters.main_pain} onChange={(value) => updateFilter('main_pain', value)} />
          <Select label="Estado" value={filters.lead_status} onChange={(value) => updateFilter('lead_status', value)} options={LEAD_STATUSES} />
          <Select label="Etapa" value={filters.funnel_stage} onChange={(value) => updateFilter('funnel_stage', value)} options={FUNNEL_STAGES} />
          <Select label="Pago" value={filters.payment_status} onChange={(value) => updateFilter('payment_status', value)} options={PAYMENT_STATUSES} />
          <Select label="Hotmart enviado" value={filters.hotmart_link_sent} onChange={(value) => updateFilter('hotmart_link_sent', value)} options={['true', 'false']} />
          <Select label="Bot pausado" value={filters.bot_paused} onChange={(value) => updateFilter('bot_paused', value)} options={['true', 'false']} />
          <Select label="Humano" value={filters.human_takeover} onChange={(value) => updateFilter('human_takeover', value)} options={['true', 'false']} />
          <Input label="Desde" type="date" value={filters.date_from} onChange={(value) => updateFilter('date_from', value)} />
          <Input label="Hasta" type="date" value={filters.date_to} onChange={(value) => updateFilter('date_to', value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
            Aplicar filtros
          </button>
          <button type="button" onClick={resetFilters} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Limpiar
          </button>
        </div>
      </form>

      <LeadTable leads={leads} loading={loading} onAction={requestAction} />

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={confirmCopy?.title}
        body={confirmCopy?.body}
        confirmLabel={confirmCopy?.label}
        tone={confirmCopy?.tone}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => executeAction(pendingAction.action, pendingAction.lead)}
      />
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', icon: Icon }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-line bg-slate-50 px-3">
        {Icon ? <Icon size={16} className="text-slate-400" /> : null}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none">
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function exportCsv(leads) {
  const columns = [
    ['name', 'Nombre'],
    [(lead) => (isRealPhone(String(lead.phone || '')) ? formatPhone(String(lead.phone)) : ''), 'Telefono real'],
    [(lead) => stripWhatsappSuffix(lead.whatsapp_id), 'WhatsApp ID'],
    [(lead) => stripWhatsappSuffix(lead.whatsapp_lid), 'WhatsApp LID'],
    ['display_phone', 'Display phone'],
    ['email', 'Correo'],
    ['username', 'Usuario'],
    ['main_pain', 'Dolor principal'],
    ['urgency', 'Urgencia'],
    ['lead_score', 'Score'],
    ['lead_status', 'Estado'],
    ['funnel_stage', 'Etapa'],
    ['main_objection', 'Objecion'],
    ['payment_status', 'Pago'],
    [(lead) => (lead.hotmart_link_sent ? 'si' : 'no'), 'Hotmart enviado'],
    ['created_at', 'Fecha ingreso'],
    ['last_contact_at', 'Ultimo contacto'],
    ['notes', 'Notas']
  ];

  const rows = [columns.map(([, label]) => label), ...leads.map((lead) => columns.map(([key]) => csvValue(typeof key === 'function' ? key(lead) : lead[key])))];
  const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leads-neurotraumas-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
