import { formatDate } from '../utils/formatDate';

export default function MessageBubble({ message }) {
  const direction = message.direction || (message.from_me ? 'outbound' : 'inbound');
  const isOutbound = direction === 'outbound' || message.from_me;
  const isSystem = direction === 'system' || message.role === 'system';

  return (
    <div className={`flex ${isSystem ? 'justify-center' : isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${
          isSystem
            ? 'bg-slate-200 text-slate-700'
            : isOutbound
              ? 'bg-teal-600 text-white'
              : 'bg-white text-slate-900 ring-1 ring-line'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body || message.content || message.message_text || ''}</p>
        <p className={`mt-2 text-[11px] ${isOutbound ? 'text-teal-50' : 'text-slate-500'}`}>{formatDate(message.created_at)}</p>
      </div>
    </div>
  );
}
