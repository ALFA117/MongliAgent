export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  asset: string;
  assetIssuer: string;
  payTo: string;
}

export interface X402Response {
  error: string;
  x402Version: number;
  accepts: PaymentRequirements[];
}

export interface PayAndFetchResult {
  data: unknown;
  txHash: string;
  amountPaid: string;
  service: string;
}

export interface WalletConfig {
  secretKey: string;
  network: 'testnet' | 'mainnet';
}