export default function Header({ admin }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Panel administrativo</p>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Operacion Neurotraumas</h2>
        </div>
        <div className="hidden rounded-lg border border-line bg-slate-50 px-3 py-2 text-right sm:block">
          <p className="text-xs text-slate-500">Admin</p>
          <p className="max-w-[240px] truncate text-sm font-semibold text-slate-800">{admin?.email || 'Sesion activa'}</p>
        </div>
      </div>
    </header>
  );
}
