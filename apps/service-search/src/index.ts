import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { x402Middleware } from './x402Middleware';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const PRICE_USDC = '0.01';
const RECIPIENT = process.env.SERVICE_SEARCH_ADDRESS ?? '';
const SERPAPI_KEY = process.env.SERPAPI_KEY ?? '';

if (!RECIPIENT) {
  console.error('[service-search] ERROR: SERVICE_SEARCH_ADDRESS is not set');
  process.exit(1);
}

// Health check (no payment required)
app.get('/health', (_req, res) => {
  res.json({ service: 'service-search', status: 'ok', priceUsdc: PRICE_USDC });
});

// Protected search endpoint
app.post(
  '/search',
  x402Middleware({ priceUsdc: PRICE_USDC, recipientAddress: RECIPIENT, serviceName: 'service-search' }),
  async (req, res) => {
    const { query } = req.body as { query?: string };

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Missing required field: query' });
      return;
    }

    if (!SERPAPI_KEY) {
      res.status(503).json({
        error: 'Search unavailable',
        detail: 'SERPAPI_KEY is not configured on this server',
      });
      return;
    }

    try {
      const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=5&hl=en&gl=us`;
      const serpRes = await fetch(serpUrl);
      const serpData = await serpRes.json() as any;

      const results = (serpData.organic_results ?? []).map((r: any) => ({
        title: r.title ?? '',
        url: r.link ?? '',
        snippet: r.snippet ?? '',
      }));

      res.json({ query, results });
    } catch (err) {
      console.error('[service-search] SerpAPI error:', err);
      res.status(500).json({ error: 'Search backend failed', detail: String(err) });
    }
  }
);

app.listen(PORT, () => {
  console.log(`[service-search] Running on :${PORT}  |  price: ${PRICE_USDC} USDC  |  recipient: ${RECIPIENT}`);
});