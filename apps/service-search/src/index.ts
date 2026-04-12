import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import { x402Middleware } from './x402Middleware';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ?? 3001;
const PRICE_USDC = '0.01';
// Accept the agent's own wallet as recipient for demo simplicity
const RECIPIENT =
  process.env.RECIPIENT_ADDRESS ??
  process.env.SERVICE_SEARCH_ADDRESS ??
  process.env.STELLAR_PUBLIC_KEY ??
  '';
const SEARCH_API_KEY = process.env.SEARCH_API_KEY ?? process.env.SERPAPI_KEY ?? '';

if (!RECIPIENT) {
  console.error('[service-search] ERROR: RECIPIENT_ADDRESS o STELLAR_PUBLIC_KEY no está configurado');
  process.exit(1);
}

if (!SEARCH_API_KEY) {
  console.warn('[service-search] AVISO: SEARCH_API_KEY no configurada — las búsquedas fallarán');
}

async function doSearch(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  // Brave Search API
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

  if (!braveRes.ok) {
    // Fallback: SerpAPI
    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}&num=5`;
    const serpRes = await fetch(serpUrl);
    if (!serpRes.ok) throw new Error(`Search APIs failed: Brave ${braveRes.status}, SerpAPI ${serpRes.status}`);
    const serpData = (await serpRes.json()) as { organic_results?: { title: string; link: string; snippet: string }[] };
    return (serpData.organic_results ?? []).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
  }

  const data = (await braveRes.json()) as {
    web?: { results?: { title: string; url: string; description?: string }[] };
  };
  return (data.web?.results ?? []).map((r) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.description ?? '',
  }));
}

const gate = x402Middleware({
  priceUsdc: PRICE_USDC,
  recipientAddress: RECIPIENT,
  serviceName: 'service-search',
});

// Endpoint español
app.post('/buscar', gate, async (req, res) => {
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

// Alias en inglés (para compatibilidad con executor)
app.post('/search', gate, async (req, res) => {
  const { query } = req.body as { query?: string };
  const q = (query ?? '').trim();
  if (!q) {
    res.status(400).json({ error: 'query is required' });
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

app.get('/health', (_req, res) => {
  res.json({
    service: 'service-search',
    status: 'ok',
    price: `${PRICE_USDC} USDC`,
    recipient: RECIPIENT,
    searchKey: SEARCH_API_KEY ? 'configurada' : 'FALTA',
  });
});

app.listen(PORT, () => {
  console.log(`[service-search] Corriendo en :${PORT}`);
  console.log(`[service-search] Precio: ${PRICE_USDC} USDC → ${RECIPIENT}`);
  console.log(`[service-search] SEARCH_API_KEY: ${SEARCH_API_KEY ? 'OK' : 'NO CONFIGURADA'}`);
});
