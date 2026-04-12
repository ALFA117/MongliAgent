import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession } from './sessions';
import { runResearch } from './executor';
import { x402Middleware } from './x402Middleware';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT ?? 3000;

// Validar que la dirección sea una clave Stellar real (56 chars, empieza con G)
function isStellarKey(v?: string): boolean {
  return !!v && v.startsWith('G') && v.length === 56;
}
const RECIPIENT =
  [
    process.env.RECIPIENT_ADDRESS,
    process.env.SERVICE_SEARCH_ADDRESS,
    process.env.STELLAR_PUBLIC_KEY,
  ].find(isStellarKey) ?? '';

const SEARCH_API_KEY = process.env.SEARCH_API_KEY ?? process.env.SERPAPI_KEY ?? '';

// Validar vars críticas al arrancar
const requiredEnv = ['STELLAR_SECRET_KEY', 'ANTHROPIC_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[MongliAgent] ERROR: ${key} no está configurado`);
    process.exit(1);
  }
}
if (!RECIPIENT) {
  console.error('[MongliAgent] ERROR: RECIPIENT_ADDRESS o STELLAR_PUBLIC_KEY no está configurado');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers de sesión ──────────────────────────────────────────────────────

function startSession(question: string, budget: number, res: express.Response): void {
  const sessionId = uuidv4();
  const session = createSession(sessionId, question, budget);
  runResearch(session).catch((err) => {
    console.error(`[MongliAgent] Error en sesión ${sessionId}:`, err);
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

// ─── Orchestrator ────────────────────────────────────────────────────────────

app.post('/investigar', (req, res) => {
  const { pregunta, presupuestoUsdc } = req.body as {
    pregunta?: string;
    presupuestoUsdc?: number;
  };
  if (!pregunta?.trim()) {
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

app.get('/estado/:sessionId', (req, res) => {
  sendSession(req.params.sessionId, res);
});

// Aliases en inglés
app.post('/research', (req, res) => {
  const { question, budgetUsdc } = req.body as { question?: string; budgetUsdc?: number };
  if (!question?.trim()) {
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

app.get('/status/:sessionId', (req, res) => {
  sendSession(req.params.sessionId, res);
});

// ─── service-search integrado (x402) ────────────────────────────────────────

async function doSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  // Brave Search
  const braveRes = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': SEARCH_API_KEY,
      },
    }
  );

  if (braveRes.ok) {
    const data = (await braveRes.json()) as {
      web?: { results?: { title: string; url: string; description?: string }[] };
    };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? '',
    }));
  }

  // Fallback: SerpAPI
  const serpRes = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}&num=5`
  );
  if (!serpRes.ok) throw new Error(`APIs de búsqueda fallaron: ${braveRes.status} / ${serpRes.status}`);
  const serpData = (await serpRes.json()) as {
    organic_results?: { title: string; link: string; snippet: string }[];
  };
  return (serpData.organic_results ?? []).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }));
}

const searchGate = x402Middleware({
  priceUsdc: '0.01',
  recipientAddress: RECIPIENT,
  serviceName: 'service-search',
});

app.post('/buscar', searchGate, async (req, res) => {
  const { consulta, query } = req.body as { consulta?: string; query?: string };
  const q = (consulta ?? query ?? '').trim();
  if (!q) {
    res.status(400).json({ error: 'Se requiere el campo "consulta"' });
    return;
  }
  try {
    const results = await doSearch(q);
    res.json({ query: q, results, service: 'service-search' });
  } catch (err) {
    console.error('[service-search] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// alias inglés
app.post('/search', searchGate, async (req, res) => {
  const { query } = req.body as { query?: string };
  const q = (query ?? '').trim();
  if (!q) { res.status(400).json({ error: 'query is required' }); return; }
  try {
    const results = await doSearch(q);
    res.json({ query: q, results, service: 'service-search' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── service-summary integrado (x402) ───────────────────────────────────────

function summarizeLocal(text: string): string {
  // Extraer primeras oraciones significativas como resumen sin LLM
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 30)
    .slice(0, 4);
  return sentences.length > 0
    ? sentences.join(' ')
    : text.slice(0, 400) + (text.length > 400 ? '...' : '');
}

async function doSummarize(text: string, context?: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'Eres un asistente de investigación. Resume el contenido de forma concisa y factual en español. Sin preámbulos.',
      messages: [
        {
          role: 'user',
          content: `${context ? `Contexto: ${context}\n\n` : ''}Resume esto en 3-5 oraciones:\n\n${text.slice(0, 8000)}`,
        },
      ],
    });
    return msg.content[0].type === 'text' ? msg.content[0].text : summarizeLocal(text);
  } catch {
    return summarizeLocal(text);
  }
}

const summaryGate = x402Middleware({
  priceUsdc: '0.02',
  recipientAddress: RECIPIENT,
  serviceName: 'service-summary',
});

app.post('/resumir', summaryGate, async (req, res) => {
  const { texto, text, contexto, context } = req.body as {
    texto?: string; text?: string; contexto?: string; context?: string;
  };
  const t = (texto ?? text ?? '').trim();
  if (!t) {
    res.status(400).json({ error: 'Se requiere el campo "texto"' });
    return;
  }
  try {
    const summary = await doSummarize(t, contexto ?? context);
    res.json({ summary, service: 'service-summary' });
  } catch (err) {
    console.error('[service-summary] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// alias inglés
app.post('/summarize', summaryGate, async (req, res) => {
  const { text, context } = req.body as { text?: string; context?: string };
  const t = (text ?? '').trim();
  if (!t) { res.status(400).json({ error: 'text is required' }); return; }
  try {
    const summary = await doSummarize(t, context);
    res.json({ summary, service: 'service-summary' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    service: 'MongliAgent',
    status: 'ok',
    endpoints: ['/investigar', '/estado/:id', '/buscar', '/resumir'],
    wallet: process.env.STELLAR_PUBLIC_KEY ?? '(no configurada)',
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    searchKey: SEARCH_API_KEY ? 'configurada' : 'FALTA',
  });
});

app.listen(PORT, () => {
  console.log(`[MongliAgent] Corriendo en :${PORT}`);
  console.log(`[MongliAgent] Wallet: ${process.env.STELLAR_PUBLIC_KEY ?? '(no configurada)'}`);
  console.log(`[MongliAgent] SEARCH_API_KEY: ${SEARCH_API_KEY ? 'OK' : 'NO CONFIGURADA'}`);
  console.log(`[MongliAgent] Recipient: ${RECIPIENT}`);
});
