import { FreighterStatus } from '../hooks/useFreighter';

interface Props {
  status: FreighterStatus;
  publicKey: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

function WalletIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5m0 0h-5a2 2 0 100 4h5v-4z" />
    </svg>
  );
}

export function FreighterButton({ status, publicKey, error, onConnect, onDisconnect }: Props) {
  const short = publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : null;

  if (status === 'connected' && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-700/50 rounded-full px-2.5 py-1 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-300 font-mono font-semibold">{short}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          title="Desconectar wallet"
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
        className="flex items-center gap-1.5 text-xs bg-gray-800 border border-gray-700 hover:border-yellow-600/50 text-yellow-400 rounded-full px-2.5 py-1 transition-colors"
      >
        <WalletIcon />
        <span className="hidden sm:inline">Instalar Freighter</span>
      </a>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={status === 'connecting'}
      title={error ?? undefined}
      className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border transition-colors
        ${status === 'error'
          ? 'bg-red-950/60 border-red-700/50 text-red-400 hover:border-red-500/50'
          : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-indigo-300 hover:border-indigo-600/50'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {status === 'connecting' ? (
        <span className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <WalletIcon />
      )}
      <span className="hidden sm:inline">
        {status === 'connecting' ? 'Conectando…' : status === 'error' ? 'Reintentar' : 'Conectar Wallet'}
      </span>
    </button>
  );
}
