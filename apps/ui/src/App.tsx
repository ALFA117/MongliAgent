import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResearchForm } from './components/ResearchForm';
import { PaymentFeed } from './components/PaymentFeed';
import { ReportPanel } from './components/ReportPanel';
import { SubtaskList } from './components/SubtaskList';
import { SessionState } from './types';

const POLL_INTERVAL_MS = 2000;

async function startResearch(question: string, budgetUsdc: number): Promise<string> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, budgetUsdc }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.sessionId as string;
}

async function fetchStatus(sessionId: string): Promise<SessionState> {
  const res = await fetch(`/api/status/${sessionId}`);
  if (!res.ok) throw new Error(`Status fetch failed: HTTP ${res.status}`);
  return res.json();
}

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async (sid: string) => {
    try {
      const state = await fetchStatus(sid);
      setSession(state);
      if (state.status === 'completed' || state.status === 'error') {
        stopPolling();
        setIsLoading(false);
      } else {
        pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS);
      }
    } catch (err) {
      console.error('Poll error:', err);
      pollRef.current = setTimeout(() => poll(sid), POLL_INTERVAL_MS * 2);
    }
  }, [stopPolling]);

  const handleSubmit = useCallback(async (question: string, budgetUsdc: number) => {
    setIsLoading(true);
    setError(null);
    setSession(null);
    setSessionId(null);
    stopPolling();

    try {
      const sid = await startResearch(question, budgetUsdc);
      setSessionId(sid);
      pollRef.current = setTimeout(() => poll(sid), 500);
    } catch (err) {
      setError(String(err));
      setIsLoading(false);
    }
  }, [poll, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const isDone = session?.status === 'completed' || session?.status === 'error';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-lg">
            M
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">MongliAgent</h1>
            <p className="text-gray-500 text-xs">Autonomous research with on-chain micropayments</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Stellar Testnet
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            <ResearchForm onSubmit={handleSubmit} isLoading={isLoading} />

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {session && <SubtaskList subtasks={session.subtasks} />}

            {/* Service price reference */}
            <div className="border border-gray-800 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Service Prices
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-400">search</span>
                  <span className="text-gray-400">$0.010 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">summarize</span>
                  <span className="text-gray-400">$0.020 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">facts</span>
                  <span className="text-gray-400">$0.005 USDC</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {!session ? (
            <div className="flex-1 flex items-center justify-center text-gray-700">
              <div className="text-center space-y-3">
                <div className="text-6xl">🤖</div>
                <p className="text-lg">Ask a question. Set a budget. Watch the agent work.</p>
                <p className="text-sm text-gray-600">
                  Every tool call is paid with real USDC on Stellar Testnet.
                </p>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex overflow-hidden ${isDone && session.report ? 'flex-row' : 'flex-col'}`}>
              {/* Payment feed — always visible */}
              <div className={`${isDone && session.report ? 'w-1/2 border-r border-gray-800' : 'flex-1'} overflow-hidden flex flex-col`}>
                <PaymentFeed session={session} />
              </div>

              {/* Report panel — shown when done */}
              {isDone && session.report && (
                <div className="w-1/2 overflow-hidden flex flex-col">
                  <ReportPanel session={session} />
                </div>
              )}

              {/* Error state */}
              {session.status === 'error' && !session.report && (
                <div className="p-4 bg-red-950 border border-red-800 rounded-lg m-4 text-red-400 text-sm">
                  {session.error ?? 'An unknown error occurred'}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}