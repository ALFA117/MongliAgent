import { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchForm } from './components/ResearchForm';
import { PaymentFeed } from './components/PaymentFeed';
import { ReportPanel } from './components/ReportPanel';
import { SubtaskList } from './components/SubtaskList';
import { SessionState } from './types';

const POLL_INTERVAL_MS = 2000;

// URL del orchestrator — en Vercel, VITE_ORCHESTRATOR_URL apunta a Railway
const ORCHESTRATOR_URL = (import.meta as { env?: { VITE_ORCHESTRATOR_URL?: string } }).env
  ?.VITE_ORCHESTRATOR_URL ?? '';

async function iniciarInvestigacion(pregunta: string, presupuestoUsdc: number): Promise<string> {
  const url = ORCHESTRATOR_URL ? `${ORCHESTRATOR_URL}/investigar` : '/api/investigar';
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
  const url = ORCHESTRATOR_URL
    ? `${ORCHESTRATOR_URL}/estado/${sessionId}`
    : `/api/estado/${sessionId}`;
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
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Encabezado */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-lg">
            M
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">MongliAgent</h1>
            <p className="text-gray-500 text-xs">Investigación autónoma con micropagos on-chain</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Stellar Testnet
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Panel lateral izquierdo */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            <ResearchForm onSubmit={handleSubmit} isCargando={isCargando} />

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {session && <SubtaskList subtasks={session.subtasks} />}

            {/* Referencia de precios */}
            <div className="border border-gray-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Precios de servicios
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-400">búsqueda</span>
                  <span className="text-gray-400">$0.010 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">resumen</span>
                  <span className="text-gray-400">$0.020 USDC</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!session ? (
            <div className="flex-1 flex items-center justify-center text-gray-700">
              <div className="text-center space-y-3">
                <div className="text-6xl">🤖</div>
                <p className="text-lg">Haz una pregunta. Pon un presupuesto. El agente trabaja.</p>
                <p className="text-sm text-gray-600">
                  Cada consulta se paga con USDC real en Stellar Testnet.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`flex-1 flex overflow-hidden ${
                terminado && session.report ? 'flex-row' : 'flex-col'
              }`}
            >
              {/* Feed de pagos — siempre visible */}
              <div
                className={`${
                  terminado && session.report ? 'w-1/2 border-r border-gray-800' : 'flex-1'
                } overflow-hidden flex flex-col`}
              >
                <PaymentFeed session={session} />
              </div>

              {/* Reporte — aparece al terminar */}
              {terminado && session.report && (
                <div className="w-1/2 overflow-hidden flex flex-col">
                  <ReportPanel session={session} />
                </div>
              )}

              {/* Estado de error sin reporte */}
              {session.status === 'error' && !session.report && (
                <div className="p-4 bg-red-950 border border-red-800 rounded-lg m-4 text-red-400 text-sm">
                  {session.error ?? 'Ocurrió un error desconocido'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
