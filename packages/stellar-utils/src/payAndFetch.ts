import { submitUsdcPayment } from './stellarPay';
import { PayAndFetchResult, WalletConfig, X402Response } from './types';

/**
 * Executes the full x402 payment + fetch cycle:
 *  1. Make the initial HTTP request (no payment).
 *  2. On HTTP 402, parse payment requirements.
 *  3. Submit a Stellar USDC payment on-chain.
 *  4. Retry the request with X-Payment header containing the tx hash.
 *  5. Return the parsed response body + payment metadata.
 */
export async function payAndFetch(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  },
  wallet: WalletConfig,
  serviceName: string
): Promise<PayAndFetchResult> {
  const method = options.method ?? 'POST';

  // Build URL with query params for GET requests
  let fullUrl = url;
  if (options.params && method === 'GET') {
    const qs = new URLSearchParams(options.params).toString();
    fullUrl = `${url}?${qs}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (options.body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  // --- Step 1: Initial request (expect 402) ---
  const res1 = await fetch(fullUrl, fetchOptions);

  if (res1.status !== 402) {
    // Unexpected — either already paid or server error
    const data = await res1.json();
    throw new Error(
      `Expected 402 from ${serviceName}, got ${res1.status}: ${JSON.stringify(data)}`
    );
  }

  const paymentRequired = await res1.json() as X402Response;
  const requirements = paymentRequired.accepts?.[0];

  if (!requirements) {
    throw new Error(`${serviceName} returned 402 but no payment requirements`);
  }

  // --- Step 2: Submit Stellar USDC payment ---
  const { txHash, amountPaid } = await submitUsdcPayment(
    wallet.secretKey,
    requirements.payTo,
    requirements.maxAmountRequired,
    serviceName
  );

  // --- Step 3: Retry with payment proof ---
  const res2 = await fetch(fullUrl, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers as Record<string, string>,
      'X-Payment': txHash,
      'X-Payment-Scheme': 'stellar',
    },
  });

  if (!res2.ok) {
    const errBody = await res2.text();
    throw new Error(
      `${serviceName} rejected payment (${res2.status}): ${errBody}`
    );
  }

  const data = await res2.json();

  return {
    data,
    txHash,
    amountPaid,
    service: serviceName,
  };
}