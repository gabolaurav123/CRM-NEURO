import { Link } from 'react-router-dom';
import { CreditCard, Eye, Link2, MessageCircle, Pause, Play, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from 'lucide-react';
import FunnelStageBadge from './FunnelStageBadge';
import LeadStatusBadge from './LeadStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import { formatDate } from '../utils/formatDate';
import { getLeadPhoneDisplay } from '../utils/formatPhone';

export default function LeadTable({ leads, loading, onAction }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-[1560px] w-full border-collapse text-left text-sm">
          <colgroup>
            {Array.from({ length: 12 }).map((_, index) => <col key={index} />)}
            <col style={{ width: 340 }} />
          </colgroup>
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <Th>Nombre</Th>
              <Th>Celular</Th>
              <Th>Correo</Th>
              <Th>Usuario</Th>
              <Th>Dolor principal</Th>
              <Th>Urgencia</Th>
              <Th>Score</Th>
              <Th>Estado</Th>
              <Th>Etapa</Th>
              <Th>Objecion</Th>
              <Th>Pago</Th>
              <Th>Ultimo contacto</Th>
              <Th className="sticky right-0 z-20 w-[340px] min-w-[340px] bg-slate-100">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={13}>
                  Cargando leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={13}>
                  No hay leads con estos filtros.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="align-top hover:bg-slate-50">
                  <Td>
                    <div className="font-bold text-slate-900">{lead.name || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-500">{lead.channel || 'canal no definido'}</div>
                  </Td>
                  <Td>
                    <PhoneCell lead={lead} />
                  </Td>
                  <Td>{lead.email || '-'}</Td>
                  <Td>{lead.username || '-'}</Td>
                  <Td>{lead.main_pain || '-'}</Td>
                  <Td>{lead.urgency ?? '-'}</Td>
                  <Td>{lead.lead_score ?? '-'}</Td>
                  <Td>
                    <LeadStatusBadge status={lead.lead_status} />
                  </Td>
                  <Td>
                    <FunnelStageBadge stage={lead.funnel_stage} />
                  </Td>
                  <Td>{lead.main_objection || '-'}</Td>
                  <Td>
                    <PaymentStatusBadge status={lead.payment_status} />
                  </Td>
                  <Td>{formatDate(lead.last_contact_at || lead.updated_at || lead.created_at)}</Td>
                  <Td className="sticky right-0 z-10 w-[340px] min-w-[340px] bg-white shadow-[-12px_0_16px_-18px_rgba(15,23,42,0.55)]">
                    <div className="grid w-[308px] grid-cols-2 gap-2">
                      <IconLink to={`/leads/${lead.id}`} label="Detalle" title="Ver detalle" icon={Eye} />
                      <IconLink to={`/conversations/${lead.id}`} label="Chat" title="Abrir conversacion" icon={MessageCircle} />
                      <IconButton
                        title={lead.bot_paused ? 'Reactivar bot' : 'Pausar bot'}
                        label={lead.bot_paused ? 'Reactivar' : 'Pausar'}
                        icon={lead.bot_paused ? Play : Pause}
                        onClick={() => onAction(lead.bot_paused ? 'resumeBot' : 'pauseBot', lead)}
                      />
                      <IconButton
                        title={lead.human_takeover ? 'Liberar control humano' : 'Tomar control humano'}
                        label={lead.human_takeover ? 'Liberar' : 'Tomar'}
                        icon={lead.human_takeover ? UserX : UserCheck}
                        onClick={() => onAction(lead.human_takeover ? 'releaseTakeover' : 'takeover', lead)}
                      />
                      <IconButton title="Reenviar Hotmart" label="Hotmart" icon={Link2} onClick={() => onAction('sendHotmartLink', lead)} />
                      <IconButton title="Marcar pago confirmado" label="Pago" icon={CreditCard} onClick={() => onAction('markPaid', lead)} />
                      <IconButton title="Borrar memoria temporal" label="Memoria" icon={Trash2} onClick={() => onAction('deleteMemory', lead)} />
                      <IconButton
                        title={lead.consent_24h ? 'Memoria consentida' : 'Sin consentimiento 24h'}
                        label="24h"
                        icon={lead.consent_24h ? ShieldCheck : ShieldOff}
                        disabled
                      />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhoneCell({ lead }) {
  const phone = getLeadPhoneDisplay(lead);
  return (
    <div>
      <div className="font-semibold text-slate-800">{phone.value}</div>
      {phone.helper ? <div className="mt-1 text-xs font-semibold text-slate-500">{phone.helper}</div> : null}
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap px-4 py-3 font-bold ${className}`}>{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-slate-700 ${className}`}>{children}</td>;
}

function IconButton({ title, label, icon: Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 min-w-0 shrink-0 items-center justify-start gap-1.5 rounded-lg border border-line bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function IconLink({ title, label, icon: Icon, to }) {
  return (
    <Link title={title} to={to} className="inline-flex h-9 min-w-0 shrink-0 items-center justify-start gap-1.5 rounded-lg border border-line bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
