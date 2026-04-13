import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SessionState } from '../types';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const SERVICE_LABELS: Record<string, string> = {
  search: 'búsqueda',
  summarize: 'resumen',
};

const SERVICE_COLORS: Record<string, string> = {
  search: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  summarize: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
};

interface Props {
  session: SessionState;
}

export function ReportPanel({ session }: Props) {
  const pagos = session.log.filter((e) => e.type === 'payment');
  const elapsed = session.endTime
    ? ((session.endTime - session.startTime) / 1000).toFixed(1)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-950">

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reporte</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {elapsed && <span className="text-gray-600">{elapsed}s</span>}
          <span className="bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 font-bold px-2 py-0.5 rounded-full tabular-nums">
            −${session.balanceUsed.toFixed(4)} USDC
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Transacciones on-chain */}
        {pagos.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/40 flex-shrink-0">
            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
              Transacciones verificables on-chain
            </p>
            <div className="space-y-1.5">
              {pagos.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${SERVICE_COLORS[p.service ?? ''] ?? 'text-gray-400 bg-gray-800/40 border-gray-700/40'}`}
                >
                  <span className="font-bold w-4 text-center flex-shrink-0">#{i + 1}</span>
                  <span className="font-semibold flex-shrink-0">
                    {SERVICE_LABELS[p.service ?? ''] ?? p.service}
                  </span>
                  <span className="font-mono font-bold flex-shrink-0">−${p.amountPaid}</span>
                  {p.txHash && (
                    <a
                      href={`${EXPLORER_BASE}/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-cyan-500 hover:text-cyan-300 font-mono underline transition-colors text-[10px] flex-shrink-0"
                      title={p.txHash}
                    >
                      {p.txHash.slice(0, 8)}…{p.txHash.slice(-6)}
                      <span>↗</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contenido del reporte */}
        <div className="px-4 py-4 report-content">
          {session.report ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {session.report}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center gap-3 text-gray-600 text-xs py-8 justify-center">
              <span className="w-4 h-4 border-2 border-gray-700 border-t-cyan-600 rounded-full animate-spin" />
              Generando reporte...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
