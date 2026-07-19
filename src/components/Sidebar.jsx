import { NavLink } from 'react-router-dom';
import { BarChart3, CreditCard, LogOut, MessageCircle, QrCode, Settings, Users, Workflow } from 'lucide-react';
import BrandLogo from './BrandLogo';

const items = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/conversations', label: 'Conversaciones', icon: MessageCircle },
  { to: '/payments', label: 'Pagos', icon: CreditCard },
  { to: '/followups', label: 'Seguimientos', icon: Workflow },
  { to: '/whatsapp', label: 'WhatsApp', icon: QrCode },
  { to: '/settings', label: 'Configuracion', icon: Settings }
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur-xl lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-r lg:border-t-0 lg:px-4 lg:py-5">
      <div className="hidden rounded-3xl bg-white p-4 shadow-soft lg:block">
        <BrandLogo compact />
        <p className="mt-4 text-xs leading-5 text-slate-500">Una sola vista para todos los leads y ambos productos.</p>
      </div>

      <nav className="flex items-center justify-between gap-1 overflow-x-auto lg:mt-6 lg:block lg:space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition lg:min-w-0 lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-sm ${isActive ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
              title={item.label}
            >
              <Icon size={19} />
              <span className="max-w-[82px] truncate lg:max-w-none">{item.label}</span>
            </NavLink>
          );
        })}
        <button type="button" onClick={onLogout} className="flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300 lg:mt-8 lg:min-w-0 lg:w-full lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-sm">
          <LogOut size={19} />
          <span>Cerrar sesion</span>
        </button>
      </nav>
    </aside>
  );
}
