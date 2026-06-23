export default function Header({ admin, crm, onChangeCrm }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Panel administrativo</p>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">{crm?.title || 'Operacion CRM'}</h2>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <button type="button" onClick={onChangeCrm} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cambiar CRM
          </button>
          <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs text-slate-500">Admin</p>
            <p className="max-w-[240px] truncate text-sm font-semibold text-slate-800">{admin?.email || 'Sesion activa'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
