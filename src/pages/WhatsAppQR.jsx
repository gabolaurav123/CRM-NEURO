import { useEffect, useState } from 'react';
import { whatsappApi } from '../api/whatsapp';
import ConfirmModal from '../components/ConfirmModal';
import QRCard from '../components/QRCard';

export default function WhatsAppQR() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (status?.status !== 'qr_pending') return undefined;
    const timer = setInterval(() => {
      loadStatus({ quiet: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [status?.status]);

  async function loadStatus({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const payload = await whatsappApi.status();
      setStatus((current) => ({ ...current, ...payload }));
      if (payload.status === 'qr_pending' && !payload.qr) {
        const qr = await whatsappApi.qr();
        setStatus((current) => ({ ...current, ...qr }));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function generateQr() {
    setLoading(true);
    setError('');
    try {
      setStatus(await whatsappApi.generateQr());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function restart() {
    setLoading(true);
    setError('');
    try {
      setStatus(await whatsappApi.restart());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    setError('');
    try {
      setStatus(await whatsappApi.logout());
      setConfirmLogout(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-ink">WhatsApp QR</h1>
        <p className="mt-1 text-sm text-slate-500">Vinculacion del numero de WhatsApp usado por el chatbot.</p>
      </div>

      {error ? <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <QRCard
        status={status}
        loading={loading}
        onGenerate={generateQr}
        onRefresh={() => loadStatus()}
        onRestart={restart}
        onLogout={() => setConfirmLogout(true)}
      />

      <ConfirmModal
        open={confirmLogout}
        title="Desconectar WhatsApp"
        body="Esto cerrara la sesion actual del numero vinculado al bot."
        confirmLabel="Desconectar"
        tone="danger"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={logout}
      />
    </div>
  );
}
