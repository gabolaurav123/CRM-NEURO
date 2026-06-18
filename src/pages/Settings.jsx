import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { settingsApi } from '../api/settings';
import { SETTING_FIELDS } from '../utils/constants';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const payload = await settingsApi.get();
      setSettings(payload.settings || {});
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = await settingsApi.update(settings);
      setSettings(payload.settings || {});
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">Configuracion</h1>
        <p className="mt-1 text-sm text-slate-500">Parametros visibles del bot y enlaces comerciales.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {saved ? <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Configuracion guardada.</div> : null}

      <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-line">
          <ShieldCheck className="mt-0.5 text-emerald-600" size={20} />
          <p className="text-sm text-slate-600">Los secretos del backend no se muestran ni se editan desde el CRM.</p>
        </div>
      </div>

      <form onSubmit={save} className="rounded-lg border border-line bg-white p-5 shadow-soft">
        {loading ? <p className="text-sm text-slate-500">Cargando configuracion...</p> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {SETTING_FIELDS.map((field) => (
            <Field key={field.key} field={field} value={settings[field.key] ?? ''} onChange={(value) => setSettings((current) => ({ ...current, [field.key]: value }))} />
          ))}
        </div>
        <button type="submit" disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar configuracion'}
        </button>
      </form>
    </div>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <label className="block lg:col-span-2">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-[120px] w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500" />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none focus:border-brand-500">
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{field.label}</span>
      <input
        type={field.type}
        step={field.step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-line bg-slate-50 px-3 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}
