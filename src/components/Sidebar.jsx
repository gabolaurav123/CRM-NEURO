import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  CreditCard,
  LogOut,
  MessageCircle,
  QrCode,
  Settings,
  Users,
  Workflow
} from 'lucide-react';

const items = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/conversations', label: 'Conversaciones', icon: MessageCircle },
  { to: '/whatsapp', label: 'WhatsApp QR', icon: QrCode },
  { to: '/payments', label: 'Pagos', icon: CreditCard },
  { to: '/followups', label: 'Follow-ups', icon: Workflow },
  { to: '/settings', label: 'Configuracion', icon: Settings }
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-3 py-2 shadow-soft backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-r lg:border-t-0 lg:px-4 lg:py-5">
      <div className="hidden px-2 pb-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
            <Bot size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Neurotraumas</p>
            <h1 className="text-xl font-bold text-ink">CRM privado</h1>
          </div>
        </div>
      </div>

      <nav className="flex items-center justify-between gap-1 overflow-x-auto lg:block lg:space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition lg:min-w-0 lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-sm ${
                  isActive ? 'bg-ink text-white shadow-soft' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                }`
              }
              title={item.label}
            >
              <Icon size={19} />
              <span className="max-w-[82px] truncate lg:max-w-none">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onLogout}
          className="flex min-w-[72px] flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 lg:mt-6 lg:min-w-0 lg:w-full lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-sm"
          title="Cerrar sesion"
        >
          <LogOut size={19} />
          <span>Cerrar sesion</span>
        </button>
      </nav>
    </aside>
  );
}
