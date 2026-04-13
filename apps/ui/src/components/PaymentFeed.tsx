import { useEffect, useRef } from 'react';
import { LogEntry, SessionState } from '../types';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const SERVICE_COLORS: Record<string, string> = {
  search: 'text-emerald-400',
  summarize: 'text-amber-400',
};

const TYPE_ICONS: Record<string, string> = {
  info: '·',
  plan: '◆',
  payment: '⬡',
  warning: '△',
  error: '✕',
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-gray-600',
  plan: 'text-purple-400',
  payment: 'text-cyan-400',
  warning: 'text-amber-500',
  error: 'text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'planificando',
  executing: 'ejecutando',
  completed: 'completado',
  error: 'error',
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'text-purple-400 bg-purple-950/60 border-purple-800/50',
  executing: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/50',
  completed: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50',
  error: 'text-red-400 bg-red-950/60 border-red-800/50',
};

const SERVICE_LABELS: Record<string, string> = {
  search: 'búsqueda',
  summarize: 'resumen',
};

interface Props {
  session: SessionState;
}

function LogItem({ entry }: { entry: LogEntry }) {
  const icon = TYPE_ICONS[entry.type] ?? '·';
  const color = TYPE_COLORS[entry.type] ?? 'text-gray-600';
  const time = new Date(entry.timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const isPayment = entry.type === 'payment';

  return (
    <div className={`animate-slide-in py-2.5 px-1 border-b border-gray-800/60 last:border-0 ${isPayment ? 'bg-cyan-950/10' : ''}`}>
      <div className="flex items-start gap-2.5">
        <span className={`${color} text-sm w-3 text-center flex-shrink-0 mt-px font-bold`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`text-xs leading-relaxed ${isPayment ? 'text-white font-medium' : 'text-gray-400'}`}>
              {entry.message}
            </span>
            <span className="text-[10px] text-gray-700 flex-shrink-0 mt-0.5 tabular-nums">{time}</span>
          </div>

          {isPayment && entry.txHash && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {entry.service && (
                <span className={`text-xs font-bold ${SERVICE_COLORS[entry.service] ?? 'text-gray-400'}`}>
                  [{SERVICE_LABELS[entry.service] ?? entry.service}]
                </span>
              )}
              {entry.amountPaid && (
                <span className="text-cyan-300 text-xs font-bold tabular-nums">
                  −${entry.amountPaid} USDC
                </span>
              )}
              {entry.balanceAfter !== undefined && (
                <span className="text-gray-500 text-xs tabular-nums">
                  restante: <span className="text-gray-300">${entry.balanceAfter.toFixed(4)}</span>
                </span>
              )}
              <a
                href={`${EXPLORER_BASE}/${entry.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:text-cyan-400 underline font-mono transition-colors ml-auto"
                title={entry.txHash}
              >
                {entry.txHash.slice(0, 8)}…{entry.txHash.slice(-6)} ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PaymentFeed({ session }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (session.log.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevLen.current = session.log.length;
    }
  }, [session.log.length]);

  const pagoCount = session.log.filter((e) => e.type === 'payment').length;
  const pct = Math.max(0, (session.balanceRemaining / session.budgetUsdc) * 100);

  return (
    <div className="flex flex-col h-full bg-[#0a0f18]">

      {/* Header del feed */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-800 bg-gray-900/60 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Feed en vivo</span>
          {session.status !== 'completed' && session.status !== 'error' && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[session.status] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
          {STATUS_LABELS[session.status] ?? session.status}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-600">{pagoCount} tx</span>
          <div className="flex items-center gap-1 text-xs tabular-nums">
            <span className="text-gray-500">$</span>
            <span className={`font-bold ${pct < 25 ? 'text-red-400' : 'text-cyan-400'}`}>
              {session.balanceRemaining.toFixed(4)}
            </span>
            <span className="text-gray-700">/ {session.budgetUsdc.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-px flex-shrink-0 bg-gray-800">
        <div
          className={`h-full transition-all duration-500 ${pct < 25 ? 'bg-red-600' : 'bg-cyan-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-3 py-1 min-h-0">
        {session.log.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <span className="w-6 h-6 border-2 border-gray-700 border-t-cyan-600 rounded-full animate-spin" />
            <p className="text-xs">Iniciando agente...</p>
          </div>
        ) : (
          session.log.map((entry, i) => <LogItem key={i} entry={entry} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
