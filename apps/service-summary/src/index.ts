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

const PORT = 3002;
const PRICE_USDC = '0.02';
const RECIPIENT = process.env.SERVICE_SUMMARY_ADDRESS ?? '';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (!RECIPIENT) {
  console.error('[service-summary] ERROR: SERVICE_SUMMARY_ADDRESS is not set');
  process.exit(1);
}

app.get('/health', (_req, res) => {
  res.json({ service: 'service-summary', status: 'ok', priceUsdc: PRICE_USDC });
});

app.post(
  '/summarize',
  x402Middleware({ priceUsdc: PRICE_USDC, recipientAddress: RECIPIENT, serviceName: 'service-summary' }),
  async (req, res) => {
    const { text } = req.body as { text?: string };

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing required field: text' });
      return;
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system:
          'You are a concise summarizer. Respond with a clear, 3-5 sentence summary of the provided text. No preamble.',
        messages: [{ role: 'user', content: `Summarize this:\n\n${text.slice(0, 8000)}` }],
      });

      const summary =
        message.content[0].type === 'text' ? message.content[0].text : '';

      res.json({ summary });
    } catch (err) {
      console.error('[service-summary] Claude error:', err);
      res.status(500).json({ error: 'Summarization failed', detail: String(err) });
    }
  }
);

app.listen(PORT, () => {
  console.log(`[service-summary] Running on :${PORT}  |  price: ${PRICE_USDC} USDC  |  recipient: ${RECIPIENT}`);
});