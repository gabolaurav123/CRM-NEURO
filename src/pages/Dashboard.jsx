import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, CreditCard, Link2, MessageCircle, ThermometerSun, Users, Wifi } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiRequest } from '../api/client';
import StatCard from '../components/StatCard';
import { formatLeadPhone } from '../utils/formatPhone';

const chartColors = ['#0f766e', '#f59e0b', '#dc2626', '#2563eb', '#16a34a', '#64748b', '#ea580c', '#0891b2'];

export default function Dashboard() {
  const [data, setData] = useState({ metrics: {}, charts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await apiRequest('/dashboard/metrics'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const metrics = data.metrics || {};
  const charts = data.charts || {};
  const whatsappDisplay = formatLeadPhone({
    phone: metrics.whatsapp_phone,
    whatsapp_id: metrics.whatsapp_id,
    display_phone: metrics.whatsapp_display_phone
  });

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Resumen comercial, operativo y de WhatsApp.</p>
        </div>
        <button className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={load}>
          Actualizar
        </button>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={metrics.total_leads} helper={`${metrics.leads_today || 0} hoy, ${metrics.leads_last_7_days || 0} ultimos 7 dias`} icon={Users} tone="slate" />
        <StatCard label="Leads calientes" value={metrics.leads_caliente} helper={`Tibios: ${metrics.leads_tibio || 0} | Frios: ${metrics.leads_frio || 0}`} icon={ThermometerSun} tone="rose" />
        <StatCard label="Ofertas presentadas" value={metrics.offers_presented} icon={Link2} tone="cyan" />
        <StatCard label="Links Hotmart enviados" value={metrics.links_sent} helper={`${metrics.payment_link_rate || 0}% tasa de link enviado`} icon={Link2} tone="cyan" />
        <StatCard label="Pagos confirmados" value={metrics.payments_confirmed} helper={`${metrics.payment_confirmed_rate || 0}% conversion confirmada`} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Pagos pendientes" value={metrics.payments_pending} icon={CreditCard} tone="amber" />
        <StatCard label="Conversaciones activas" value={metrics.active_conversations} helper={`${metrics.human_takeover || 0} con humano`} icon={MessageCircle} tone="teal" />
        <StatCard label="Bot pausado" value={metrics.bot_paused} helper={`Bot global: ${metrics.bot_status || 'enabled'}`} icon={Activity} tone="slate" />
        <StatCard label="WhatsApp" value={metrics.whatsapp_status || 'disconnected'} helper={whatsappDisplay} icon={Wifi} tone={metrics.whatsapp_status === 'connected' ? 'emerald' : 'rose'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricPanel label="Objecion principal" value={metrics.common_objection} />
        <MetricPanel label="Dolor principal" value={metrics.common_pain} />
        <MetricPanel label="Promedios" value={`Urgencia ${metrics.avg_urgency || 0} | Score ${metrics.avg_lead_score || 0}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Leads por dia">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={charts.leads_by_day || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Leads por estado">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={charts.leads_by_status || []} dataKey="total" nameKey="label" outerRadius={100} label>
                {(charts.leads_by_status || []).map((entry, index) => (
                  <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Leads por dolor principal">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.leads_by_pain || []} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#0891b2" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Embudo por etapa">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts.funnel || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {loading ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-slate-500 shadow-soft">Cargando dashboard...</div> : null}
    </div>
  );
}

function MetricPanel({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink">{value || 'Sin datos'}</p>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
