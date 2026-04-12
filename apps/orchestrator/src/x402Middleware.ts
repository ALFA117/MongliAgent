import { Request, Response, NextFunction } from 'express';
import { verifyUsdcPayment } from './stellar';

interface X402Options {
  priceUsdc: string;
  recipientAddress: string;
  serviceName: string;
}

const usedTxHashes = new Set<string>();

export function x402Middleware(opts: X402Options) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      res.status(402).json({
        error: 'Payment Required',
        x402Version: 1,
        accepts: [
          {
            scheme: 'stellar',
            network: 'testnet',
            maxAmountRequired: opts.priceUsdc,
            asset: 'USDC',
            assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            payTo: opts.recipientAddress,
            description: `${opts.serviceName} — pago por uso`,
          },
        ],
      });
      return;
    }

    if (usedTxHashes.has(paymentHeader)) {
      res.status(402).json({ error: 'Transacción ya utilizada' });
      return;
    }

    const valid = await verifyUsdcPayment(paymentHeader, opts.recipientAddress, opts.priceUsdc);

    if (!valid) {
      res.status(402).json({
        error: 'Verificación de pago fallida',
        detail: `Se esperaba pago USDC de ${opts.priceUsdc} a ${opts.recipientAddress}`,
      });
      return;
    }

    usedTxHashes.add(paymentHeader);
    next();
  };
}
