import { ArrowRight, LogOut } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { CRM_OPTIONS } from '../utils/crm';

export default function CrmSelect({ admin, onSelect, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div className="rounded-lg bg-white px-4 py-3">
            <BrandLogo compact />
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            <LogOut size={16} /> Salir
          </button>
        </header>

        <main className="flex flex-1 items-center py-12">
          <div className="w-full">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">Seleccion de CRM</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Elige que operacion quieres ver</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Sesion activa: {admin?.email || 'admin'}. Cada CRM mantiene sus leads, pagos y conversaciones separados. WhatsApp usa el mismo chatbot y el mismo numero vinculado.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {CRM_OPTIONS.map((crm) => (
                <button
                  key={crm.key}
                  type="button"
                  onClick={() => onSelect(crm.key)}
                  className="group rounded-lg border border-white/10 bg-white p-5 text-left text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-teal-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">CRM</p>
                      <h2 className="mt-2 text-2xl font-bold">{crm.name}</h2>
                    </div>
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700 transition group-hover:bg-teal-50 group-hover:text-teal-700">
                      <ArrowRight size={20} />
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{crm.description}</p>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
