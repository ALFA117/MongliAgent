import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { x402Middleware } from './x402Middleware';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3003;
const PRICE_USDC = '0.005';
const RECIPIENT = process.env.SERVICE_DATA_ADDRESS ?? '';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (!RECIPIENT) {
  console.error('[service-data] ERROR: SERVICE_DATA_ADDRESS is not set');
  process.exit(1);
}

app.get('/health', (_req, res) => {
  res.json({ service: 'service-data', status: 'ok', priceUsdc: PRICE_USDC });
});

app.get(
  '/facts',
  x402Middleware({ priceUsdc: PRICE_USDC, recipientAddress: RECIPIENT, serviceName: 'service-data' }),
  async (req, res) => {
    const topic = req.query['topic'] as string | undefined;

    if (!topic) {
      res.status(400).json({ error: 'Missing required query param: topic' });
      return;
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system:
          'You are a fact database. Return a JSON object with a "facts" array containing 5 concise, specific, and accurate facts about the topic. Each fact is a plain string. Respond ONLY with valid JSON.',
        messages: [
          {
            role: 'user',
            content: `Topic: ${topic.slice(0, 200)}`,
          },
        ],
      });

      const rawText =
        message.content[0].type === 'text' ? message.content[0].text : '{"facts":[]}';

      let parsed: { facts: string[] };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Try to extract JSON if wrapped in markdown
        const match = rawText.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { facts: [] };
      }

      res.json({ topic, facts: parsed.facts ?? [] });
    } catch (err) {
      console.error('[service-data] Claude error:', err);
      res.status(500).json({ error: 'Facts retrieval failed', detail: String(err) });
    }
  }
);

app.listen(PORT, () => {
  console.log(`[service-data] Running on :${PORT}  |  price: ${PRICE_USDC} USDC  |  recipient: ${RECIPIENT}`);
});