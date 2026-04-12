import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { x402Middleware } from './x402Middleware';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT ?? 3002;
const PRICE_USDC = '0.02';
const RECIPIENT =
  process.env.RECIPIENT_ADDRESS ??
  process.env.SERVICE_SUMMARY_ADDRESS ??
  process.env.STELLAR_PUBLIC_KEY ??
  '';

if (!RECIPIENT) {
  console.error('[service-summary] ERROR: RECIPIENT_ADDRESS o STELLAR_PUBLIC_KEY no está configurado');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[service-summary] ERROR: ANTHROPIC_API_KEY no está configurado');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarize(text: string, context?: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'Eres un asistente de investigación. Resume el contenido de forma concisa y factual en español. Sin preámbulos.',
    messages: [
      {
        role: 'user',
        content: `${context ? `Contexto de investigación: ${context}\n\n` : ''}Resume esto en 3-5 oraciones:\n\n${text.slice(0, 8000)}`,
      },
    ],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : 'No se pudo generar el resumen.';
}

const gate = x402Middleware({
  priceUsdc: PRICE_USDC,
  recipientAddress: RECIPIENT,
  serviceName: 'service-summary',
});

// Endpoint español
app.post('/resumir', gate, async (req, res) => {
  const { texto, text, contexto, context } = req.body as {
    texto?: string;
    text?: string;
    contexto?: string;
    context?: string;
  };
  const t = (texto ?? text ?? '').trim();
  if (!t) {
    res.status(400).json({ error: 'Se requiere el campo "texto"' });
    return;
  }
  try {
    const summary = await summarize(t, contexto ?? context);
    res.json({ summary, service: 'service-summary' });
  } catch (err) {
    console.error('[service-summary] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Alias en inglés (para compatibilidad con executor)
app.post('/summarize', gate, async (req, res) => {
  const { text, context } = req.body as { text?: string; context?: string };
  const t = (text ?? '').trim();
  if (!t) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  try {
    const summary = await summarize(t, context);
    res.json({ summary, service: 'service-summary' });
  } catch (err) {
    console.error('[service-summary] error:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    service: 'service-summary',
    status: 'ok',
    price: `${PRICE_USDC} USDC`,
    recipient: RECIPIENT,
  });
});

app.listen(PORT, () => {
  console.log(`[service-summary] Corriendo en :${PORT}`);
  console.log(`[service-summary] Precio: ${PRICE_USDC} USDC → ${RECIPIENT}`);
});
