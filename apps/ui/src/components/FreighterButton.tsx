import { FreighterStatus } from '../hooks/useFreighter';

interface Props {
  status: FreighterStatus;
  publicKey: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function FreighterButton({ status, publicKey, error, onConnect, onDisconnect }: Props) {
  const short = publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : null;

  if (status === 'connected' && publicKey) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-700/60 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
          <span className="text-indigo-300 font-mono text-xs font-semibold">{short}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-gray-600 hover:text-red-400 transition-colors text-xs w-5 h-5 flex items-center justify-center"
          title="Desconectar"
        >
          ✕
        </button>
      </div>
    );
  }

  if (status === 'not_installed') {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs bg-yellow-950/60 border border-yellow-700/50
          text-yellow-400 rounded-full px-3 py-1 hover:border-yellow-500/60 transition-colors"
      >
        <span>⚠</span>
        <span className="hidden sm:inline">Instalar Freighter</span>
      </a>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={status === 'connecting'}
      title={error ?? undefined}
      className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border transition-all
        font-semibold disabled:opacity-60 disabled:cursor-not-allowed
        ${status === 'error'
          ? 'bg-red-950/60 border-red-700/50 text-red-400 hover:border-red-500'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-indigo-300 hover:border-indigo-600/60 hover:bg-indigo-950/30'
        }`}
    >
      {status === 'connecting' ? (
        <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <span>🔐</span>
      )}
      <span className="hidden sm:inline">
        {status === 'connecting' ? 'Conectando…' : status === 'error' ? 'Reintentar' : 'Conectar Wallet'}
      </span>
    </button>
  );
}
