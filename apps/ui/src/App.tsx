import { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchForm } from './components/ResearchForm';
import { PaymentFeed } from './components/PaymentFeed';
import { ReportPanel } from './components/ReportPanel';
import { SubtaskList } from './components/SubtaskList';
import { FreighterButton } from './components/FreighterButton';
import { useFreighter } from './hooks/useFreighter';
import { SessionState } from './types';

const POLL_MS = 2000;
const API = import.meta.env.VITE_ORCHESTRATOR_URL || '';

// ─── API helpers ────────────────────────────────────────────────
async function prepararSesion(userPublicKey: string, usdc: number): Promise<string> {
  const p = new URLSearchParams({ userPublicKey, presupuestoUsdc: usdc.toFixed(7) });
  const r = await fetch(`${API}/preparar-sesion?${p}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return (await r.json() as { xdr: string }).xdr;
}

async function iniciarInvestigacion(
  pregunta: string, usdc: number,
  userPublicKey?: string, fundingTxHash?: string
): Promise<string> {
  const r = await fetch(`${API}/investigar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta, presupuestoUsdc: usdc, userPublicKey, fundingTxHash }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return (await r.json() as { sessionId: string }).sessionId;
}

async function obtenerEstado(sid: string): Promise<SessionState> {
  const r = await fetch(`${API}/estado/${sid}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<SessionState>;
}

// ─── Tipos ──────────────────────────────────────────────────────
type Tab = 'inicio' | 'feed' | 'reporte';

// ─── Íconos inline ──────────────────────────────────────────────
function IgIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// ─── App ────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('inicio');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freighter = useFreighter();

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
  }, []);

  const poll = useCallback(async (sid: string) => {
    try {
      const s = await obtenerEstado(sid);
      setSession(s);
      if (s.status === 'completed' || s.status === 'error') {
        stopPoll();
        setLoading(false);
        setTab(s.report ? 'reporte' : 'feed');
      } else {
        pollRef.current = setTimeout(() => poll(sid), POLL_MS);
      }
    } catch {
      pollRef.current = setTimeout(() => poll(sid), POLL_MS * 2);
    }
  }, [stopPoll]);

  const handleSubmit = useCallback(async (pregunta: string, usdc: number) => {
    if (!freighter.publicKey) return;
    setLoading(true);
    setError(null);
    setSession(null);
    stopPoll();

    let fundingTxHash: string | undefined;
    try {
      setFirmando(true);
      const xdr = await prepararSesion(freighter.publicKey, usdc);
      fundingTxHash = await freighter.signAndSubmit(xdr);
    } catch (e) {
      setError(`Error al firmar: ${String(e)}`);
      setLoading(false);
      setFirmando(false);
      return;
    } finally {
      setFirmando(false);
    }

    setTab('feed');
    try {
      const sid = await iniciarInvestigacion(pregunta, usdc, freighter.publicKey, fundingTxHash);
      pollRef.current = setTimeout(() => poll(sid), 500);
    } catch (e) {
      setError(String(e));
      setLoading(false);
      setTab('inicio');
    }
  }, [poll, stopPoll, freighter]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const done = session?.status === 'completed' || session?.status === 'error';
  const pagos = session?.log.filter(e => e.type === 'payment').length ?? 0;
  const walletOk = freighter.status === 'connected';

  // ─── Sidebar content ─────────────────────────────────────────
  const SidebarContent = (
    <div className="p-4 space-y-5">

      {/* Wallet card */}
      {walletOk && freighter.publicKey ? (
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 px-4 py-3 space-y-1">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Wallet conectada</p>
          <p className="text-xs text-indigo-300 font-mono break-all leading-relaxed">
            {freighter.publicKey}
          </p>
          <p className="text-[10px] text-gray-600">
            Una sola firma al inicio — el agente opera solo.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sin wallet</p>
          <p className="text-xs text-gray-600">Conecta Freighter para empezar a investigar con tus fondos.</p>
        </div>
      )}

      {/* Formulario */}
      <ResearchForm
        onSubmit={handleSubmit}
        isCargando={loading}
        walletConnected={walletOk}
        onConnectWallet={freighter.connect}
      />

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-xs text-red-400">
          <p className="font-bold mb-0.5">Error</p>
          <p className="text-red-400/80">{error}</p>
        </div>
      )}

      {/* Plan de subtareas */}
      {session && <SubtaskList subtasks={session.subtasks} />}

      {/* Fondeo tx */}
      {session?.fundingTxHash && (
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Fondeo de sesión</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${session.fundingTxHash}`}
            target="_blank" rel="noopener noreferrer"
            className="text-indigo-300 text-[11px] font-mono hover:text-indigo-200 underline break-all block"
          >
            {session.fundingTxHash.slice(0, 10)}…{session.fundingTxHash.slice(-10)} ↗
          </a>
        </div>
      )}

      {/* Precios */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3 space-y-2">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Precios x402</p>
        {[
          { label: 'búsqueda web', cost: '0.010', color: 'bg-emerald-500' },
          { label: 'resumen IA',   cost: '0.020', color: 'bg-amber-500' },
        ].map(({ label, cost, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <span className="text-xs text-gray-500 tabular-nums">${cost} USDC</span>
          </div>
        ))}
      </div>

      {/* Badge hackathon */}
      <div className="rounded-xl border border-cyan-900/30 bg-cyan-950/10 px-4 py-3 text-center">
        <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest">Agents on Stellar 2026</p>
        <p className="text-[10px] text-gray-600 mt-0.5">Cada tx es real y verificable en blockchain</p>
      </div>

    </div>
  );

  // ─── Contenido principal (feed + reporte) ────────────────────
  const MainContent = session ? (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Feed */}
      <div className={`
        flex flex-col overflow-hidden flex-shrink-0 min-w-0
        ${done && session.report ? 'hidden md:flex md:w-1/2 md:border-r md:border-gray-800' : 'flex flex-1'}
        ${tab === 'reporte' ? 'hidden md:flex md:w-1/2 md:border-r md:border-gray-800' : 'flex flex-1'}
      `}>
        <PaymentFeed session={session} />
      </div>

      {/* Reporte */}
      {done && session.report && (
        <div className={`
          flex flex-col overflow-hidden flex-1 min-w-0
          ${tab === 'feed' ? 'hidden md:flex' : 'flex'}
        `}>
          <ReportPanel session={session} />
        </div>
      )}

      {/* Error sin reporte */}
      {session.status === 'error' && !session.report && tab !== 'inicio' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-xl border border-red-800/60 bg-red-950/30 px-5 py-4 text-sm text-red-400 max-w-sm text-center">
            {session.error ?? 'Ocurrió un error desconocido.'}
          </div>
        </div>
      )}
    </div>
  ) : (
    // Empty state desktop
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <img src="/logo.jpg" alt="MongliAgent"
        className="w-20 h-20 rounded-2xl object-cover ring-2 ring-cyan-600/30 shadow-2xl shadow-cyan-500/10" />
      <div className="space-y-1.5">
        <p className="text-gray-300 text-base font-semibold">Haz una pregunta.</p>
        <p className="text-gray-300 text-base font-semibold">Define un presupuesto.</p>
        <p className="text-cyan-400 text-base font-bold">El agente investiga y paga solo.</p>
      </div>
      <p className="text-gray-600 text-xs max-w-xs leading-relaxed">
        Cada herramienta usada genera una transacción real en Stellar Testnet — verificable públicamente.
      </p>
      {!walletOk && (
        <button
          onClick={freighter.connect}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold
            rounded-xl transition-colors flex items-center gap-2"
        >
          🔐 Conectar Freighter para empezar
        </button>
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#080c14] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 px-4 border-b border-gray-800/80 bg-[#0a0f1a]
        flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src="/logo.jpg" alt="MongliAgent"
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-cyan-600/40" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0a0f1a]" />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sm tracking-tight">
              Mongli<span className="text-cyan-400">Agent</span>
            </p>
            <p className="text-gray-600 text-[10px] hidden sm:block mt-0.5">Investigación autónoma · micropagos x402</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FreighterButton
            status={freighter.status}
            publicKey={freighter.publicKey}
            error={freighter.error}
            onConnect={freighter.connect}
            onDisconnect={freighter.disconnect}
          />
          <a href="https://instagram.com/ALFA_EDG_" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-600 hover:text-pink-400 transition-colors text-xs">
            <IgIcon />
            <span className="hidden md:inline">@ALFA_EDG_</span>
          </a>
          <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/40 rounded-full px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-[10px] font-bold">Testnet</span>
          </div>
        </div>
      </header>

      {/* ── Banner: firmando ────────────────────────────────── */}
      {firmando && (
        <div className="flex-shrink-0 bg-indigo-950/80 border-b border-indigo-800/50 px-4 py-2
          flex items-center gap-2 text-xs text-indigo-200">
          <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Aprueba el pago en Freighter — <strong>una sola firma</strong> para toda la sesión.
        </div>
      )}

      {/* ── Mobile tabs ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex md:hidden border-b border-gray-800 bg-[#0a0f1a]">
        {([
          { id: 'inicio', label: 'Inicio' },
          { id: 'feed',   label: 'Feed',    badge: pagos },
          { id: 'reporte',label: 'Reporte', show: done && !!session?.report },
        ] as { id: Tab; label: string; badge?: number; show?: boolean }[])
          .filter(t => t.show !== false)
          .map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors relative
                ${tab === t.id
                  ? 'text-cyan-400 border-b-2 border-cyan-500'
                  : 'text-gray-600 hover:text-gray-400'}`}
            >
              {t.label}
              {t.badge ? (
                <span className="ml-1 bg-cyan-700 text-white text-[9px] font-bold rounded-full px-1.5 py-px">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Sidebar — siempre en desktop, solo en tab 'inicio' en mobile */}
        <aside className={`
          flex-shrink-0 w-full md:w-80 border-r border-gray-800/80 bg-[#0a0f1a] overflow-y-auto
          ${tab === 'inicio' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
        `}>
          {SidebarContent}
        </aside>

        {/* Main — siempre en desktop, feed/reporte en mobile */}
        <main className={`
          flex-1 overflow-hidden min-w-0
          ${tab === 'inicio' ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
        `}>
          {MainContent}
        </main>

      </div>
    </div>
  );
}
