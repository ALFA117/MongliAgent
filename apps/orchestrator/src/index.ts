import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from './sessions';
import { runResearch } from './executor';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Validate critical env vars on startup
const requiredEnv = ['STELLAR_SECRET_KEY', 'ANTHROPIC_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[orchestrator] ERROR: ${key} is not set`);
    process.exit(1);
  }
}

/**
 * POST /research
 * Body: { question: string, budgetUsdc: number }
 * Returns: { sessionId: string }
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

  const sessionId = uuidv4();
  const session = createSession(sessionId, question.trim(), budget);

  // Fire-and-forget async execution
  runResearch(session).catch((err) => {
    console.error(`[orchestrator] Unhandled error in session ${sessionId}:`, err);
  });

  res.json({ sessionId });
});

/**
 * GET /status/:sessionId
 * Returns full session state for polling
 */
app.get('/status/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
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
});

app.get('/health', (_req, res) => {
  res.json({ service: 'orchestrator', status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[orchestrator] Running on :${PORT}`);
  console.log(`[orchestrator] Agent wallet: ${process.env.STELLAR_PUBLIC_KEY ?? '(not set)'}`);
});