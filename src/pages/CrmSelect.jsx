import { ArrowRight, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { CRM_OPTIONS } from '../utils/crm';

export default function CrmSelect({
  admin,
  activeCrmKey = '',
  loadingActiveCrm = false,
  activatingCrmKey = '',
  error = '',
  onActivate,
  onSelect,
  onLogout
}) {
  const activeCrm = CRM_OPTIONS.find((crm) => crm.key === activeCrmKey);

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
              Sesion activa: {admin?.email || 'admin'}. Puedes entrar a revisar cualquier operacion y elegir con el switch cual queda activa para guardar los nuevos leads de WhatsApp.
            </p>
            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
              {loadingActiveCrm ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <CheckCircle2 size={16} className="shrink-0 text-teal-300" />}
              <span className="truncate">
                CRM activo para nuevos datos: {loadingActiveCrm ? 'consultando...' : activeCrm?.name || 'sin confirmar'}
              </span>
            </div>
            {error ? <p className="mt-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-100 ring-1 ring-rose-400/30">{error}</p> : null}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {CRM_OPTIONS.map((crm) => {
                const isActive = activeCrmKey === crm.key;
                const isActivating = activatingCrmKey === crm.key;
                const switchDisabled = loadingActiveCrm || Boolean(activatingCrmKey) || isActive;

                return (
                  <article
                    key={crm.key}
                    className={`rounded-lg border bg-white p-5 text-ink shadow-soft transition ${
                      isActive ? 'border-teal-300 ring-2 ring-teal-200' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">CRM</p>
                        <h2 className="mt-2 text-2xl font-bold">{crm.name}</h2>
                      </div>
                      {isActive ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                          <CheckCircle2 size={14} /> Activo
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-600">{crm.description}</p>

                    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => onActivate(crm.key)}
                        disabled={switchDisabled}
                        role="switch"
                        aria-checked={isActive}
                        className="inline-flex items-center gap-3 text-left text-sm font-bold text-slate-700 disabled:cursor-default disabled:opacity-80"
                      >
                        <span
                          className={`relative h-7 w-12 rounded-full transition ${
                            isActive ? 'bg-teal-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                              isActive ? 'left-6' : 'left-1'
                            }`}
                          />
                        </span>
                        <span>{isActivating ? 'Activando...' : isActive ? 'Guarda nuevos leads' : 'Activar guardado'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelect(crm.key)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Entrar <ArrowRight size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
