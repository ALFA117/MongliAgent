import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // local only; Railway inyecta vars directamente
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from './sessions';
import { runResearch } from './executor';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3000;

// Validar vars críticas al arrancar
const requiredEnv = ['STELLAR_SECRET_KEY', 'ANTHROPIC_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[orchestrator] ERROR: ${key} no está configurado`);
    process.exit(1);
  }
}

// ─── Helpers compartidos ────────────────────────────────────────────────────

function startSession(question: string, budget: number, res: express.Response): void {
  const sessionId = uuidv4();
  const session = createSession(sessionId, question, budget);

  runResearch(session).catch((err) => {
    console.error(`[orchestrator] Error en sesión ${sessionId}:`, err);
  });

  res.json({ sessionId });
}

function sendSession(sessionId: string, res: express.Response): void {
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Sesión no encontrada' });
    return;
  }
  res.json({
    id: session.id,
    question: session.question,
    status: session.status,
    budgetUsdc: session.budgetUsdc,
    balanceUsed: session.balanceUsed,
    balanceRemaining: session.budgetUsdc - session.balanceUsed,
    subtasks: session.subtasks.map((t) => ({
      id: t.id,
      service: t.service,
      input: t.input,
      reason: t.reason,
      cost: t.cost,
      status: t.status,
      txHash: t.txHash,
      error: t.error,
    })),
    log: session.log,
    report: session.report,
    startTime: session.startTime,
    endTime: session.endTime,
    error: session.error,
  });
}

// ─── Endpoints en español ───────────────────────────────────────────────────

/**
 * POST /investigar
 * Body: { pregunta: string, presupuestoUsdc: number }
 * Returns: { sessionId: string }
 */
app.post('/investigar', (req, res) => {
  const { pregunta, presupuestoUsdc } = req.body as {
    pregunta?: string;
    presupuestoUsdc?: number;
  };

  if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
    res.status(400).json({ error: 'El campo "pregunta" es obligatorio' });
    return;
  }

  const budget = Number(presupuestoUsdc);
  if (!budget || budget <= 0 || budget > 10) {
    res.status(400).json({ error: 'presupuestoUsdc debe ser un número positivo (máximo 10)' });
    return;
  }

  startSession(pregunta.trim(), budget, res);
});

/**
 * GET /estado/:sessionId
 * Devuelve el estado completo de la sesión para polling
 */
app.get('/estado/:sessionId', (req, res) => {
  sendSession(req.params.sessionId, res);
});

// ─── Endpoints en inglés (compatibilidad con versiones anteriores) ──────────

/**
 * POST /research
 * Body: { question: string, budgetUsdc: number }
 */
app.post('/research', (req, res) => {
  const { question, budgetUsdc } = req.body as {
    question?: string;
    budgetUsdc?: number;
  };

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  const budget = Number(budgetUsdc);
  if (!budget || budget <= 0 || budget > 10) {
    res.status(400).json({ error: 'budgetUsdc must be a positive number up to 10' });
    return;
  }

  startSession(question.trim(), budget, res);
});

/**
 * GET /status/:sessionId
 */
app.get('/status/:sessionId', (req, res) => {
  sendSession(req.params.sessionId, res);
});

// ─── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    service: 'orchestrator',
    status: 'ok',
    wallet: process.env.STELLAR_PUBLIC_KEY ?? '(no configurada)',
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    searchUrl: process.env.SERVICE_SEARCH_URL ?? 'http://localhost:3001',
    summaryUrl: process.env.SERVICE_SUMMARY_URL ?? 'http://localhost:3002',
  });
});

app.listen(PORT, () => {
  console.log(`[orchestrator] Corriendo en :${PORT}`);
  console.log(`[orchestrator] Wallet: ${process.env.STELLAR_PUBLIC_KEY ?? '(no configurada)'}`);
  console.log(`[orchestrator] Red: ${process.env.STELLAR_NETWORK ?? 'testnet'}`);
  console.log(`[orchestrator] service-search: ${process.env.SERVICE_SEARCH_URL ?? 'http://localhost:3001'}`);
  console.log(`[orchestrator] service-summary: ${process.env.SERVICE_SUMMARY_URL ?? 'http://localhost:3002'}`);
});
