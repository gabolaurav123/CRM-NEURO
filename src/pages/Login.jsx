import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, UserRound } from 'lucide-react';
import { apiRequest, setToken } from '../api/client';
import BrandLogo from '../components/BrandLogo';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      setToken(payload.token);
      onLogin?.(payload.admin);
      navigate('/select-crm', { replace: true });
    } catch (loginError) {
      setError(loginError.message === 'ADMIN_AUTH_NOT_CONFIGURED' ? 'Configura al menos un admin y JWT_SECRET.' : 'Credenciales invalidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <section>
          <div className="inline-flex rounded-lg bg-white px-4 py-3">
            <BrandLogo />
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">CRM privado</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            Administracion privada para elegir y operar los CRMs disponibles, con conversaciones, pagos, follow-ups y vinculacion de WhatsApp.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 text-ink shadow-soft">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Acceso admin</p>
            <h2 className="mt-2 text-2xl font-bold">Iniciar sesion</h2>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">Email o usuario</span>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3">
              <UserRound size={18} className="text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full bg-transparent outline-none"
                required
                autoComplete="username"
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-700">Contrasena</span>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3">
              <Lock size={18} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full bg-transparent outline-none"
                required
                autoComplete="current-password"
              />
            </div>
          </label>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

          <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-ink px-4 py-3 font-bold text-white hover:bg-slate-700">
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
