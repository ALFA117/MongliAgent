import React, { useState } from 'react';

interface Props {
  onSubmit: (pregunta: string, presupuestoUsdc: number) => void;
  isCargando: boolean;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export function ResearchForm({ onSubmit, isCargando, walletConnected, onConnectWallet }: Props) {
  const [pregunta, setPregunta] = useState('');
  const [presupuesto, setPresupuesto] = useState(0.05);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pregunta.trim() && walletConnected) {
      onSubmit(pregunta.trim(), presupuesto);
    }
  };

  const canSubmit = walletConnected && !isCargando && pregunta.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Pregunta */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-widest">
          Pregunta de investigación
        </label>
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          disabled={isCargando}
          placeholder="¿Cuáles son los últimos avances en micropagos con blockchain?"
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 text-sm
            placeholder-gray-600 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/40
            resize-none disabled:opacity-50 transition-colors"
        />
      </div>

      {/* Presupuesto */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Presupuesto
          </label>
          <span className="text-cyan-400 font-bold text-sm tabular-nums">
            ${presupuesto.toFixed(3)} USDC
          </span>
        </div>
        <input
          type="range"
          min={0.02}
          max={1.0}
          step={0.005}
          value={presupuesto}
          onChange={(e) => setPresupuesto(parseFloat(e.target.value))}
          disabled={isCargando}
          className="w-full accent-cyan-500 disabled:opacity-50 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>$0.02</span>
          <span className="text-gray-500">≈ {Math.floor(presupuesto / 0.01)} búsquedas</span>
          <span>$1.00</span>
        </div>
      </div>

      {/* Wallet requerida */}
      {!walletConnected && (
        <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-lg">🔗</span>
            <div>
              <p className="text-indigo-300 text-sm font-bold">Wallet requerida</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Conecta Freighter para pagar con USDC — una sola firma por investigación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnectWallet}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold
              rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🔐</span> Conectar Freighter
          </button>
        </div>
      )}

      {/* Botón principal */}
      {walletConnected && (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800
            disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl
            transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
        >
          {isCargando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Investigando...
            </>
          ) : (
            <>
              <span>Investigar</span>
              <span className="text-cyan-300">→</span>
            </>
          )}
        </button>
      )}
    </form>
  );
}
