import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SessionState } from '../types';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const SERVICE_LABELS: Record<string, string> = {
  search: 'búsqueda',
  summarize: 'resumen',
};

const SERVICE_COLORS: Record<string, string> = {
  search: 'text-green-400 bg-green-950/50 border-green-800/50',
  summarize: 'text-yellow-400 bg-yellow-950/50 border-yellow-800/50',
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
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Reporte
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {elapsed && (
              <span className="text-gray-500">{elapsed}s</span>
            )}
            <span className="bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 font-bold px-2 py-0.5 rounded-full">
              −${session.balanceUsed.toFixed(4)} USDC
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Transacciones on-chain — siempre visible para los jueces */}
        {pagos.length > 0 && (
          <div className="px-4 py-3 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
              Transacciones on-chain verificables
            </p>
            <div className="space-y-2">
              {pagos.map((p, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${SERVICE_COLORS[p.service ?? ''] ?? 'text-gray-400 bg-gray-800/50 border-gray-700'}`}>
                  <span className="font-bold">
                    #{i + 1}
                  </span>
                  <span className="font-semibold">
                    {SERVICE_LABELS[p.service ?? ''] ?? p.service}
                  </span>
                  <span className="font-mono text-cyan-300">−${p.amountPaid}</span>
                  {p.txHash && (
                    <a
                      href={`${EXPLORER_BASE}/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-cyan-500 hover:text-cyan-300 font-mono underline transition-colors"
                      title={p.txHash}
                    >
                      {p.txHash.slice(0, 8)}…{p.txHash.slice(-6)}
                      <span className="text-base leading-none">↗</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reporte en markdown */}
        <div className="px-4 py-4 report-content bg-gray-950">
          {session.report ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {session.report}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center gap-3 text-gray-500 text-sm py-8 justify-center">
              <span className="w-5 h-5 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin flex-shrink-0" />
              Generando reporte...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
