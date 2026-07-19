export default function Header({ admin }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-700">Centro comercial inteligente</p>
          <h2 className="text-xl font-black text-ink sm:text-2xl">Gimnasio del Cerebro</h2>
        </div>
        <div className="hidden rounded-2xl border border-line bg-white px-4 py-2 text-right shadow-sm sm:block">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sesion activa</p>
          <p className="max-w-[240px] truncate text-sm font-bold text-slate-800">{admin?.email || 'Administrador'}</p>
        </div>
      </div>
    </header>
  );
}
