import { submitUsdcPayment } from './stellarPay';
import { PayAndFetchResult, WalletConfig, X402Response } from './types';

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

  // Paso 1: request inicial (espera 402)
  const res1 = await fetch(fullUrl, fetchOptions);

  if (res1.status !== 402) {
    const data = await res1.json();
    throw new Error(`Se esperaba 402 de ${serviceName}, se recibió ${res1.status}: ${JSON.stringify(data)}`);
  }

  const paymentRequired = (await res1.json()) as X402Response;
  const requirements = paymentRequired.accepts?.[0];

  if (!requirements) {
    throw new Error(`${serviceName} devolvió 402 sin requisitos de pago`);
  }

  // Paso 2: pago USDC en Stellar
  const { txHash, amountPaid } = await submitUsdcPayment(
    wallet.secretKey,
    requirements.payTo,
    requirements.maxAmountRequired,
    serviceName
  );

  // Paso 3: reintento con prueba de pago
  const res2 = await fetch(fullUrl, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.headers as Record<string, string>),
      'X-Payment': txHash,
      'X-Payment-Scheme': 'stellar',
    },
  });

  if (!res2.ok) {
    const errBody = await res2.text();
    throw new Error(`${serviceName} rechazó el pago (${res2.status}): ${errBody}`);
  }

  const data = await res2.json();
  return { data, txHash, amountPaid, service: serviceName };
}
