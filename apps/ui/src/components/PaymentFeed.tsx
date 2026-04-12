import { useEffect, useRef } from 'react';
import { LogEntry, SessionState } from '../types';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const SERVICE_COLORS: Record<string, string> = {
  search: 'text-green-400',
  summarize: 'text-yellow-400',
};

const TYPE_ICONS: Record<string, string> = {
  info: '○',
  plan: '◆',
  payment: '⬡',
  warning: '△',
  error: '✕',
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-gray-400',
  plan: 'text-purple-400',
  payment: 'text-cyan-400',
  warning: 'text-yellow-500',
  error: 'text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'planificando',
  executing: 'ejecutando',
  completed: 'completado',
  error: 'error',
};

const SERVICE_LABELS: Record<string, string> = {
  search: 'búsqueda',
  summarize: 'resumen',
};

interface Props {
  session: SessionState;
}

function LogItem({ entry }: { entry: LogEntry }) {
  const icon = TYPE_ICONS[entry.type] ?? '○';
  const color = TYPE_COLORS[entry.type] ?? 'text-gray-400';
  const time = new Date(entry.timestamp).toLocaleTimeString('es-ES', { hour12: false });

  return (
    <div className="animate-slide-in flex gap-3 py-2 border-b border-gray-800 last:border-0">
      <span className={`${color} w-4 text-center flex-shrink-0 mt-0.5`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-sm ${entry.type === 'payment' ? 'text-white' : 'text-gray-300'}`}>
            {entry.message}
          </span>
          <span className="text-xs text-gray-600 flex-shrink-0 mt-0.5">{time}</span>
        </div>

        {entry.type === 'payment' && entry.txHash && (
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            {entry.service && (
              <span className={`font-semibold ${SERVICE_COLORS[entry.service] ?? 'text-gray-400'}`}>
                [{SERVICE_LABELS[entry.service] ?? entry.service}]
              </span>
            )}
            {entry.amountPaid && (
              <span className="text-cyan-300 font-bold">−${entry.amountPaid} USDC</span>
            )}
            {entry.balanceAfter !== undefined && (
              <span className="text-gray-400">
                saldo: <span className="text-white">${entry.balanceAfter.toFixed(4)}</span>
              </span>
            )}
            <a
              href={`${EXPLORER_BASE}/${entry.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-300 underline truncate max-w-[200px]"
              title={entry.txHash}
            >
              {entry.txHash.slice(0, 12)}...{entry.txHash.slice(-6)} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentFeed({ session }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLogLen = useRef(0);

  useEffect(() => {
    if (session.log.length > prevLogLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevLogLen.current = session.log.length;
    }
  }, [session.log.length]);

  const pagoCount = session.log.filter((e) => e.type === 'payment').length;
  const statusColors: Record<string, string> = {
    planning: 'bg-purple-900 text-purple-300',
    executing: 'bg-cyan-900 text-cyan-300',
    completed: 'bg-green-900 text-green-300',
    error: 'bg-red-900 text-red-300',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Feed de pagos en vivo
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[session.status] ?? ''}`}>
            {STATUS_LABELS[session.status] ?? session.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {pagoCount} pago{pagoCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Saldo:</span>
            <span className={`font-bold tabular-nums transition-all duration-300 ${
              session.balanceRemaining < session.budgetUsdc * 0.2 ? 'text-red-400' : 'text-cyan-400'
            }`}>
              ${session.balanceRemaining.toFixed(4)}
            </span>
            <span className="text-gray-600">/ ${session.budgetUsdc.toFixed(3)}</span>
          </div>
        </div>
      </div>

      <div className="h-1 bg-gray-800 flex-shrink-0">
        <div
          className="h-full bg-cyan-600 transition-all duration-500"
          style={{ width: `${Math.max(0, (session.balanceRemaining / session.budgetUsdc) * 100)}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0 bg-gray-900 min-h-0">
        {session.log.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Esperando que el agente arranque...
          </div>
        ) : (
          session.log.map((entry, i) => (
            <LogItem key={i} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
