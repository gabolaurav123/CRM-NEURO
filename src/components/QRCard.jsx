import { RefreshCw, Smartphone } from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import { formatLeadPhone } from '../utils/formatPhone';

export default function QRCard({ status, loading, onGenerate, onRefresh, onRestart, onLogout }) {
  const qrSource = normalizeQrSource(status?.qr);
  const connected = status?.status === 'connected';
  const qrPending = status?.status === 'qr_pending';
  const connectedIdentity = formatLeadPhone({
    phone: status?.phone,
    whatsapp_id: status?.whatsapp_id,
    display_phone: status?.display_phone
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Estado actual</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">{statusLabel(status?.status)}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {connected
                ? 'WhatsApp conectado correctamente.'
                : qrPending
                  ? 'Escanea este QR desde WhatsApp para conectar el numero al bot.'
                  : 'WhatsApp no esta conectado.'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${statusTone(status?.status)}`}>
            {status?.status || 'disconnected'}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <Info label="Numero / ID conectado" value={connectedIdentity} />
          <Info label="Ultima conexion" value={formatDate(status?.last_connected_at)} />
          <Info label="Ultimo QR" value={formatDate(status?.last_qr_at)} />
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-slate-700" onClick={onGenerate} disabled={loading}>
            Generar QR
          </button>
          <button className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onGenerate} disabled={loading}>
            Regenerar QR
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={16} /> Actualizar estado
          </button>
          <button className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onRestart} disabled={loading}>
            Reiniciar sesion
          </button>
          <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700" onClick={onLogout} disabled={loading}>
            Desconectar WhatsApp
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">Vincular WhatsApp</h3>
            <p className="text-sm text-slate-500">Codigo de vinculacion del bot</p>
          </div>
        </div>

        <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-line bg-slate-50 p-4">
          {qrSource ? (
            <img src={qrSource} alt="QR de WhatsApp" className="h-auto w-full max-w-[320px] rounded-lg bg-white p-2" />
          ) : (
            <div className="text-center text-sm text-slate-500">Presiona Generar QR para crear un nuevo codigo.</div>
          )}
        </div>

        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Abre WhatsApp en tu celular.</li>
          <li>Toca los tres puntos o configuracion.</li>
          <li>Entra a Dispositivos vinculados.</li>
          <li>Toca Vincular dispositivo.</li>
          <li>Escanea el QR que aparece en esta pantalla.</li>
        </ol>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-line">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-slate-800">{value}</dd>
    </div>
  );
}

function statusLabel(status) {
  if (status === 'connected') return 'WhatsApp conectado correctamente';
  if (status === 'qr_pending') return 'QR pendiente de escaneo';
  if (status === 'initializing') return 'Inicializando sesion';
  return 'WhatsApp desconectado';
}

function statusTone(status) {
  if (status === 'connected') return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  if (status === 'qr_pending') return 'bg-amber-100 text-amber-800 ring-amber-200';
  if (status === 'initializing') return 'bg-blue-100 text-blue-800 ring-blue-200';
  return 'bg-red-100 text-red-800 ring-red-200';
}

function normalizeQrSource(value) {
  if (!value) return '';
  if (value.startsWith('data:image') || value.startsWith('http')) return value;
  if (/^[A-Za-z0-9+/=]+$/.test(value.slice(0, 80))) return `data:image/png;base64,${value}`;
  return value;
}
