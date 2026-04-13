import { Subtask } from '../types';

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-gray-800 text-gray-600 bg-gray-900/30',
  running:   'border-cyan-700/60 text-cyan-400 bg-cyan-950/20',
  completed: 'border-emerald-800/50 text-emerald-400 bg-emerald-950/20',
  skipped:   'border-red-900/50 text-red-500/60 bg-red-950/10',
};

const STATUS_DOTS: Record<string, string> = {
  pending:   'bg-gray-700',
  running:   'bg-cyan-500 animate-pulse',
  completed: 'bg-emerald-500',
  skipped:   'bg-red-800',
};

const SERVICE_LABELS: Record<string, string> = {
  search:    'búsqueda',
  summarize: 'resumen',
};

const SERVICE_COLORS: Record<string, string> = {
  search:    'text-emerald-400',
  summarize: 'text-amber-400',
};

interface Props {
  subtasks: Subtask[];
}

export function SubtaskList({ subtasks }: Props) {
  if (subtasks.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">Plan de investigación</p>
      <div className="space-y-1.5">
        {subtasks.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 border rounded-lg px-3 py-2 transition-all duration-300 ${STATUS_STYLES[t.status]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOTS[t.status]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold ${SERVICE_COLORS[t.service] ?? 'text-gray-400'}`}>
                  {SERVICE_LABELS[t.service] ?? t.service}
                </span>
                <span className="text-[10px] text-gray-600 tabular-nums">${t.cost} USDC</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{t.input}</p>
              {t.txHash && (
                <p className="text-[10px] text-cyan-700 mt-0.5 font-mono truncate">
                  {t.txHash.slice(0, 10)}...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
