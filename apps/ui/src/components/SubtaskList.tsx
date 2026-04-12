import React from 'react';
import { Subtask } from '../types';

const STATUS_STYLES: Record<string, string> = {
  pending:   'border-gray-600 text-gray-500',
  running:   'border-cyan-500 text-cyan-400 animate-pulse',
  completed: 'border-green-600 text-green-400',
  skipped:   'border-red-800 text-red-500 line-through',
};

const SERVICE_BADGE: Record<string, string> = {
  search:    'bg-green-900 text-green-300',
  summarize: 'bg-yellow-900 text-yellow-300',
  facts:     'bg-blue-900 text-blue-300',
};

interface Props {
  subtasks: Subtask[];
}

export function SubtaskList({ subtasks }: Props) {
  if (subtasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</p>
      {subtasks.map((t) => (
        <div
          key={t.id}
          className={`border rounded-lg px-3 py-2 transition-all duration-300 ${STATUS_STYLES[t.status]}`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${SERVICE_BADGE[t.service] ?? 'bg-gray-700 text-gray-300'}`}>
              {t.service}
            </span>
            <span className="text-xs font-semibold text-gray-400">${t.cost}</span>
            <span className="text-xs text-gray-600 capitalize ml-auto">{t.status}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">{t.input}</p>
          {t.txHash && (
            <p className="text-xs text-cyan-600 mt-0.5 truncate">
              tx: {t.txHash.slice(0, 16)}...
            </p>
          )}
        </div>
      ))}
    </div>
  );
}