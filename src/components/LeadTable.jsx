import { Link } from 'react-router-dom';
import { CreditCard, Eye, Link2, MessageCircle, Pause, Play, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from 'lucide-react';
import FunnelStageBadge from './FunnelStageBadge';
import LeadStatusBadge from './LeadStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import { formatDate } from '../utils/formatDate';
import { formatPhone } from '../utils/formatPhone';

export default function LeadTable({ leads, loading, onAction }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-[1240px] w-full border-collapse text-left text-sm">
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
              <Th>Acciones</Th>
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
                  <Td>{formatPhone(lead.phone)}</Td>
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
                  <Td>
                    <div className="grid grid-cols-5 gap-1.5">
                      <IconLink to={`/leads/${lead.id}`} title="Ver detalle" icon={Eye} />
                      <IconLink to={`/conversations/${lead.id}`} title="Abrir conversacion" icon={MessageCircle} />
                      <IconButton
                        title={lead.bot_paused ? 'Reactivar bot' : 'Pausar bot'}
                        icon={lead.bot_paused ? Play : Pause}
                        onClick={() => onAction(lead.bot_paused ? 'resumeBot' : 'pauseBot', lead)}
                      />
                      <IconButton
                        title={lead.human_takeover ? 'Liberar control humano' : 'Tomar control humano'}
                        icon={lead.human_takeover ? UserX : UserCheck}
                        onClick={() => onAction(lead.human_takeover ? 'releaseTakeover' : 'takeover', lead)}
                      />
                      <IconButton title="Reenviar Hotmart" icon={Link2} onClick={() => onAction('sendHotmartLink', lead)} />
                      <IconButton title="Marcar pago confirmado" icon={CreditCard} onClick={() => onAction('markPaid', lead)} />
                      <IconButton title="Borrar memoria temporal" icon={Trash2} onClick={() => onAction('deleteMemory', lead)} />
                      <IconButton
                        title={lead.consent_24h ? 'Memoria consentida' : 'Sin consentimiento 24h'}
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

function Th({ children }) {
  return <th className="whitespace-nowrap px-4 py-3 font-bold">{children}</th>;
}

function Td({ children }) {
  return <td className="max-w-[220px] px-4 py-3 text-slate-700">{children}</td>;
}

function IconButton({ title, icon: Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-slate-700 hover:bg-slate-100"
    >
      <Icon size={16} />
    </button>
  );
}

function IconLink({ title, icon: Icon, to }) {
  return (
    <Link title={title} to={to} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-slate-700 hover:bg-slate-100">
      <Icon size={16} />
    </Link>
  );
}
