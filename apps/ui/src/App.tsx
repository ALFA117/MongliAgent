import { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchForm } from './components/ResearchForm';
import { PaymentFeed } from './components/PaymentFeed';
import { ReportPanel } from './components/ReportPanel';
import { SubtaskList } from './components/SubtaskList';
import { SessionState } from './types';

const POLL_INTERVAL_MS = 2000;
const ORCHESTRATOR_URL: string = import.meta.env.VITE_ORCHESTRATOR_URL || '';

async function iniciarInvestigacion(pregunta: string, presupuestoUsdc: number): Promise<string> {
  const res = await fetch(`${ORCHESTRATOR_URL}/investigar`, {
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
  const res = await fetch(`${ORCHESTRATOR_URL}/estado/${sessionId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SessionState>;
}

type Tab = 'form' | 'feed' | 'report';

function InstagramIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isCargando, setIsCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('form');
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
        setActiveTab(estado.report ? 'report' : 'feed');
      } else {
        pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS);
      }
    } catch {
      pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS * 2);
    }
  }, [detenerPolling]);

  const handleSubmit = useCallback(async (pregunta: string, presupuestoUsdc: number) => {
    setIsCargando(true);
    setError(null);
    setSession(null);
    setActiveTab('feed');
    detenerPolling();
    try {
      const sid = await iniciarInvestigacion(pregunta, presupuestoUsdc);
      pollRef.current = setTimeout(() => poll(sid), 500);
    } catch (err) {
      setError(String(err));
      setIsCargando(false);
      setActiveTab('form');
    }
  }, [poll, detenerPolling]);

  useEffect(() => () => detenerPolling(), [detenerPolling]);

  const terminado = session?.status === 'completed' || session?.status === 'error';
  const pagoCount = session?.log.filter(e => e.type === 'payment').length ?? 0;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'form', label: 'Investigar' },
    { id: 'feed', label: 'Feed', badge: pagoCount },
    { id: 'report', label: 'Reporte' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col font-mono text-white">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src="/logo.jpg" alt="MongliAgent"
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover ring-2 ring-cyan-500/50" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-none tracking-tight">
              Mongli<span className="text-cyan-400">Agent</span>
            </h1>
            <p className="text-gray-500 text-xs hidden sm:block">Investigación autónoma · micropagos on-chain</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <a href="https://instagram.com/ALFA_EDG_" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-400 transition-colors">
            <InstagramIcon />
            <span className="hidden sm:inline">@ALFA_EDG_</span>
          </a>
          <div className="flex items-center gap-1.5 text-xs bg-green-950/60 border border-green-800/50 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 font-semibold text-xs">Testnet</span>
          </div>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="flex md:hidden border-b border-gray-800 bg-gray-900 flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative
              ${activeTab === tab.id ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500'}`}>
            {tab.label}
            {tab.badge ? (
              <span className="ml-1 bg-cyan-600 text-white rounded-full px-1.5 text-xs">{tab.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop sidebar / Mobile form tab */}
        <aside className={`
          md:w-80 md:flex-shrink-0 md:border-r md:border-gray-800 md:flex md:flex-col md:overflow-y-auto
          ${activeTab === 'form' ? 'flex flex-col w-full overflow-y-auto' : 'hidden md:flex'}
        `}>
          <div className="p-4 space-y-4">
            <ResearchForm onSubmit={handleSubmit} isCargando={isCargando} />

            {error && (
              <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-3 text-red-400 text-xs">
                <span className="font-bold">Error: </span>{error}
              </div>
            )}

            {session && <SubtaskList subtasks={session.subtasks} />}

            <div className="border border-gray-800 rounded-xl p-4 bg-gray-900/40">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Precios x402</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-xs font-semibold">búsqueda</span>
                  </div>
                  <span className="text-gray-400 text-xs">$0.010 USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-yellow-400 text-xs font-semibold">resumen</span>
                  </div>
                  <span className="text-gray-400 text-xs">$0.020 USDC</span>
                </div>
              </div>
            </div>

            <div className="border border-cyan-900/40 rounded-xl p-4 bg-cyan-950/20">
              <p className="text-xs font-bold text-cyan-700 uppercase tracking-widest mb-1">Agents on Stellar</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Cada consulta genera una transacción real verificable on-chain.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Desktop: empty state */}
          {!session && (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center space-y-5 px-8">
                <img src="/logo.jpg" alt="MongliAgent"
                  className="w-24 h-24 rounded-2xl object-cover mx-auto ring-2 ring-cyan-500/30 shadow-2xl shadow-cyan-500/10" />
                <div className="space-y-1">
                  <p className="text-lg text-gray-400 font-semibold">Haz una pregunta.</p>
                  <p className="text-lg text-gray-400 font-semibold">Pon un presupuesto.</p>
                  <p className="text-lg text-cyan-400 font-bold">El agente investiga y paga solo.</p>
                </div>
                <p className="text-sm text-gray-600">Cada herramienta usada genera una transacción real en Stellar Testnet.</p>
              </div>
            </div>
          )}

          {/* Feed tab (mobile) / always visible on desktop when session exists */}
          {session && (
            <div className={`
              flex-1 flex overflow-hidden min-h-0
              ${terminado && session.report ? 'md:flex-row flex-col' : ''}
            `}>
              <div className={`
                overflow-hidden flex flex-col min-h-0
                ${terminado && session.report ? 'md:w-1/2 md:border-r md:border-gray-800' : 'flex-1'}
                ${activeTab === 'feed' || activeTab === 'report' ? 'flex' : 'hidden md:flex'}
                ${activeTab === 'report' && terminado && session.report ? 'hidden md:flex' : ''}
              `}>
                <PaymentFeed session={session} />
              </div>

              {terminado && session.report && (
                <div className={`
                  overflow-hidden flex flex-col min-h-0
                  ${activeTab === 'report' ? 'flex flex-1' : 'hidden md:flex md:w-1/2'}
                `}>
                  <ReportPanel session={session} />
                </div>
              )}

              {session.status === 'error' && !session.report && (
                <div className={`p-4 m-4 bg-red-950/60 border border-red-800/60 rounded-xl text-red-400 text-sm
                  ${activeTab === 'feed' ? 'block' : 'hidden md:block'}`}>
                  {session.error ?? 'Ocurrió un error desconocido'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800/40 px-4 py-2 flex items-center justify-between flex-shrink-0 bg-gray-950">
        <span className="text-xs text-gray-700">MongliAgent · Agents on Stellar 2026</span>
        <a href="https://instagram.com/ALFA_EDG_" target="_blank" rel="noopener noreferrer"
          className="text-xs text-gray-700 hover:text-pink-400 transition-colors flex items-center gap-1">
          <InstagramIcon />
          @ALFA_EDG_
        </a>
      </footer>
    </div>
  );
}
