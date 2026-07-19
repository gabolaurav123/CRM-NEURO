import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, CreditCard, MessageCircle, Sparkles, Target, ThermometerSun, Users, Wifi } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiRequest } from '../api/client';
import ProductInterestBadge from '../components/ProductInterestBadge';
import StatCard from '../components/StatCard';
import { formatDate } from '../utils/formatDate';
import { formatLeadPhone } from '../utils/formatPhone';
import { getProductLabel } from '../utils/products';

const chartColors = ['#7c3aed', '#06b6d4', '#f59e0b', '#94a3b8', '#16a34a', '#f43f5e'];

export default function Dashboard() {
  const [data, setData] = useState({ metrics: {}, charts: {}, recent_leads: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

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
  const productChart = (charts.leads_by_product || []).map((item) => ({ ...item, name: getProductLabel(item.label) }));
  const conversionChart = (charts.product_conversion || []).map((item) => ({ ...item, name: getProductLabel(item.product) }));
  const whatsappDisplay = formatLeadPhone({ phone: metrics.whatsapp_phone, whatsapp_id: metrics.whatsapp_id, display_phone: metrics.whatsapp_display_phone });

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-200 ring-1 ring-white/10"><Sparkles size={14} /> Vista general</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Gimnasio del Cerebro</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">Todos los contactos en un solo CRM, con claridad sobre el producto que despertó su interés y las acciones que requieren atención.</p>
          </div>
          <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5" onClick={load}>Actualizar datos</button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <HeroMetric label="Nuevos esta semana" value={metrics.leads_last_7_days || 0} />
          <HeroMetric label="Conversion general" value={`${metrics.payment_confirmed_rate || 0}%`} />
          <HeroMetric label="Seguimientos vencidos" value={metrics.overdue_followups || 0} alert={Number(metrics.overdue_followups) > 0} />
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total leads" value={metrics.total_leads} helper={`${metrics.leads_today || 0} ingresaron hoy`} icon={Users} tone="slate" />
        <StatCard label="Leads calientes" value={metrics.leads_caliente} helper={`Tibios: ${metrics.leads_tibio || 0}`} icon={ThermometerSun} tone="rose" />
        <StatCard label="Pagos confirmados" value={metrics.payments_confirmed} helper={`${metrics.payment_confirmed_rate || 0}% de conversion`} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Conversaciones 24h" value={metrics.active_conversations} helper={`${metrics.human_takeover || 0} con atencion humana`} icon={MessageCircle} tone="teal" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <ChartPanel title="Interes por producto" subtitle="Distribucion real de los leads del CRM unificado">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={productChart} dataKey="total" nameKey="name" innerRadius={62} outerRadius={105} paddingAngle={3} label>
                {productChart.map((entry, index) => <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Conversion por producto" subtitle="Ventas confirmadas sobre leads registrados">
          <div className="space-y-4 pt-2">
            {conversionChart.map((item, index) => (
              <div key={item.product} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-line">
                <div className="flex items-center justify-between gap-3">
                  <ProductInterestBadge value={item.product} />
                  <strong className="text-xl text-ink">{item.conversion || 0}%</strong>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${Math.min(Number(item.conversion) || 0, 100)}%`, backgroundColor: chartColors[index % chartColors.length] }} /></div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{item.sales || 0} ventas de {item.leads || 0} leads</p>
              </div>
            ))}
          </div>
        </ChartPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AttentionCard icon={Clock3} label="Seguimientos vencidos" value={metrics.overdue_followups} to="/followups?status=pending" tone="rose" />
        <AttentionCard icon={Target} label="Producto sin definir" value={metrics.product_undefined} to="/leads?product_interest=sin_definir" tone="amber" />
        <AttentionCard icon={CreditCard} label="Pagos pendientes" value={metrics.payments_pending} to="/payments?status=pending" tone="cyan" />
        <AttentionCard icon={Wifi} label="WhatsApp" value={metrics.whatsapp_status || 'disconnected'} helper={whatsappDisplay} to="/whatsapp" tone={metrics.whatsapp_status === 'connected' ? 'emerald' : 'rose'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Leads de los ultimos 14 dias" subtitle="Ritmo de captacion comercial">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={charts.leads_by_day || []}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} /></LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Embudo comercial" subtitle="Cantidad de leads en cada etapa">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.funnel || []}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={75} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#06b6d4" radius={[7, 7, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div><h2 className="text-lg font-black text-ink">Leads recientes</h2><p className="text-xs text-slate-500">Ultimos ingresos al CRM</p></div>
          <Link to="/leads" className="inline-flex items-center gap-1 text-sm font-extrabold text-brand-700">Ver todos <ArrowRight size={15} /></Link>
        </div>
        <div className="divide-y divide-line">
          {(data.recent_leads || []).map((lead) => (
            <Link key={lead.id} to={`/leads/${lead.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-center">
              <div><p className="font-extrabold text-slate-900">{lead.name || 'Lead sin nombre'}</p><p className="text-xs text-slate-500">{formatLeadPhone(lead) || 'Sin telefono'}</p></div>
              <ProductInterestBadge lead={lead} />
              <span className="text-xs font-bold capitalize text-slate-500">{lead.lead_status || 'sin estado'}</span>
              <span className="text-xs text-slate-400">{formatDate(lead.created_at)}</span>
            </Link>
          ))}
          {!loading && !(data.recent_leads || []).length ? <p className="px-5 py-8 text-center text-sm text-slate-500">Aun no hay leads registrados.</p> : null}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricPanel label="Objecion mas frecuente" value={metrics.common_objection} />
        <MetricPanel label="Dolor mas frecuente" value={metrics.common_pain} />
        <MetricPanel label="Promedios comerciales" value={`Urgencia ${metrics.avg_urgency || 0} · Score ${metrics.avg_lead_score || 0}`} />
      </div>

      {loading ? <div className="rounded-2xl border border-line bg-white p-4 text-sm text-slate-500 shadow-soft">Actualizando dashboard...</div> : null}
    </div>
  );
}

function HeroMetric({ label, value, alert }) { return <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><p className="text-xs font-bold uppercase tracking-wider text-indigo-200">{label}</p><p className={`mt-1 text-3xl font-black ${alert ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>; }
function MetricPanel({ label, value }) { return <div className="rounded-2xl border border-line bg-white p-5 shadow-soft"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 text-lg font-black text-ink">{value || 'Sin datos'}</p></div>; }
function ChartPanel({ title, subtitle, children }) { return <section className="rounded-3xl border border-line bg-white p-5 shadow-soft"><h2 className="text-lg font-black text-ink">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}<div className="mt-4">{children}</div></section>; }
function AttentionCard({ icon: Icon, label, value, helper, to, tone }) {
  const tones = { rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', cyan: 'bg-cyan-50 text-cyan-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return <Link to={to} className="group rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5"><div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${tones[tone] || tones.cyan}`}><Icon size={19} /></div><p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-ink">{value || 0}</p>{helper ? <p className="mt-1 truncate text-xs text-slate-500">{helper}</p> : null}</Link>;
}
