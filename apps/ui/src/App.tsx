import { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchForm } from './components/ResearchForm';
import { PaymentFeed } from './components/PaymentFeed';
import { ReportPanel } from './components/ReportPanel';
import { SubtaskList } from './components/SubtaskList';
import { SessionState } from './types';

const POLL_INTERVAL_MS = 2000;
const ORCHESTRATOR_URL: string = import.meta.env.VITE_ORCHESTRATOR_URL || '';

async function iniciarInvestigacion(pregunta: string, presupuestoUsdc: number): Promise<string> {
  const url = `${ORCHESTRATOR_URL}/investigar`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta, presupuestoUsdc }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { sessionId: string };
  return data.sessionId;
}

async function obtenerEstado(sessionId: string): Promise<SessionState> {
  const url = `${ORCHESTRATOR_URL}/estado/${sessionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al obtener estado: HTTP ${res.status}`);
  return res.json() as Promise<SessionState>;
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isCargando, setIsCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detenerPolling = useCallback(() => {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
  }, []);

  const poll = useCallback(async (sid: string) => {
    try {
      const estado = await obtenerEstado(sid);
      setSession(estado);
      if (estado.status === 'completed' || estado.status === 'error') {
        detenerPolling();
        setIsCargando(false);
      } else {
        pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error('Error en polling:', err);
      pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS * 2);
    }
  }, [detenerPolling]);

  const handleSubmit = useCallback(async (pregunta: string, presupuestoUsdc: number) => {
    setIsCargando(true);
    setError(null);
    setSession(null);
    detenerPolling();
    try {
      const sid = await iniciarInvestigacion(pregunta, presupuestoUsdc);
      pollRef.current = setTimeout(() => poll(sid), 500);
    } catch (err) {
      setError(String(err));
      setIsCargando(false);
    }
  }, [poll, detenerPolling]);

  useEffect(() => () => detenerPolling(), [detenerPolling]);

  const terminado = session?.status === 'completed' || session?.status === 'error';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col font-mono">
      {/* Header */}
      <header className="border-b border-cyan-900/40 bg-gray-950/95 backdrop-blur px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="/logo.jpg"
              alt="MongliAgent"
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20"
            />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-950 animate-pulse" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-none tracking-tight">
              Mongli<span className="text-cyan-400">Agent</span>
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Investigación autónoma · micropagos on-chain</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com/ALFA_EDG_"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-pink-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @ALFA_EDG_
          </a>
          <div className="flex items-center gap-2 text-xs bg-green-950/50 border border-green-800/50 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            <span className="text-green-400 font-semibold">Stellar Testnet</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-800/60 flex flex-col overflow-y-auto bg-gray-950">
          <div className="p-5 space-y-5">
            <ResearchForm onSubmit={handleSubmit} isCargando={isCargando} />

            {error && (
              <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-3 text-red-400 text-xs leading-relaxed">
                <span className="font-bold">Error: </span>{error}
              </div>
            )}

            {session && <SubtaskList subtasks={session.subtasks} />}

            {/* Precios */}
            <div className="border border-gray-800/60 rounded-xl p-4 bg-gray-900/40">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Precios x402
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-xs font-semibold">búsqueda</span>
                  </div>
                  <span className="text-gray-400 text-xs font-mono">$0.010 USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-400 text-xs font-semibold">resumen</span>
                  </div>
                  <span className="text-gray-400 text-xs font-mono">$0.020 USDC</span>
                </div>
              </div>
            </div>

            {/* Info hackathon */}
            <div className="border border-cyan-900/40 rounded-xl p-4 bg-cyan-950/20">
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-2">
                Agents on Stellar
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Cada consulta genera una transacción real en Stellar Testnet verificable on-chain.
              </p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-950">
          {!session ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 px-8">
                <img src="/logo.jpg" alt="MongliAgent" className="w-28 h-28 rounded-2xl object-cover mx-auto ring-2 ring-cyan-500/30 shadow-2xl shadow-cyan-500/10" />
                <div>
                  <p className="text-xl text-gray-400 font-semibold">Haz una pregunta.</p>
                  <p className="text-xl text-gray-400 font-semibold">Pon un presupuesto.</p>
                  <p className="text-xl text-cyan-400 font-bold">El agente investiga y paga solo.</p>
                </div>
                <p className="text-sm text-gray-600">
                  Cada herramienta usada genera una transacción real en Stellar Testnet.
                </p>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex overflow-hidden ${terminado && session.report ? 'flex-row' : 'flex-col'}`}>
              <div className={`${terminado && session.report ? 'w-1/2 border-r border-gray-800/60' : 'flex-1'} overflow-hidden flex flex-col`}>
                <PaymentFeed session={session} />
              </div>
              {terminado && session.report && (
                <div className="w-1/2 overflow-hidden flex flex-col">
                  <ReportPanel session={session} />
                </div>
              )}
              {session.status === 'error' && !session.report && (
                <div className="p-4 bg-red-950/60 border border-red-800/60 rounded-xl m-4 text-red-400 text-sm">
                  {session.error ?? 'Ocurrió un error desconocido'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/40 px-6 py-2 flex items-center justify-between flex-shrink-0 bg-gray-950/80">
        <span className="text-xs text-gray-700">MongliAgent · Agents on Stellar Hackathon 2026</span>
        <a
          href="https://instagram.com/ALFA_EDG_"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-700 hover:text-pink-400 transition-colors"
        >
          @ALFA_EDG_
        </a>
      </footer>
    </div>
  );
}
