import ReactMarkdown from 'react-markdown';
import { SessionState } from '../types';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx';

const SERVICE_LABELS: Record<string, string> = {
  search: 'búsqueda',
  summarize: 'resumen',
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 rounded-t-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Reporte de investigación
          </span>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {elapsed && <span>{elapsed}s</span>}
            <span className="text-cyan-500 font-semibold">
              −${session.balanceUsed.toFixed(4)} USDC total
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900 rounded-b-xl min-h-0">
        {pagos.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Transacciones on-chain
            </p>
            <div className="space-y-1">
              {pagos.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`font-semibold ${
                    p.service === 'search' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {SERVICE_LABELS[p.service ?? ''] ?? p.service}
                  </span>
                  <span className="text-cyan-300">−${p.amountPaid}</span>
                  {p.txHash && (
                    <a
                      href={`${EXPLORER_BASE}/${p.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-cyan-400 underline"
                    >
                      {p.txHash.slice(0, 10)}...{p.txHash.slice(-6)} ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-4 report-content">
          {session.report ? (
            <ReactMarkdown>{session.report}</ReactMarkdown>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              Generando reporte...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
