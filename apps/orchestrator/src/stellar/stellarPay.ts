import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
} from '@stellar/stellar-sdk';

const USDC_ISSUER_TESTNET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';

export interface StellarPayResult {
  txHash: string;
  amountPaid: string;
}

export async function submitUsdcPayment(
  secretKey: string,
  destination: string,
  amount: string,
  memo?: string
): Promise<StellarPayResult> {
  const keypair = Keypair.fromSecret(secretKey);
  const server = new Horizon.Server(HORIZON_TESTNET);
  const account = await server.loadAccount(keypair.publicKey());
  const usdcAsset = new Asset('USDC', USDC_ISSUER_TESTNET);

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  }).addOperation(
    Operation.payment({ destination, asset: usdcAsset, amount })
  );

  if (memo) {
    builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const transaction = builder.setTimeout(30).build();
  transaction.sign(keypair);
  const result = await server.submitTransaction(transaction);

  return { txHash: result.hash, amountPaid: amount };
}

/**
 * Construye una transacción de pago USDC sin firmarla.
 * Devuelve el XDR en base64 para que el usuario lo firme con Freighter.
 */
export async function buildUnsignedPaymentXdr(
  sourcePublicKey: string,
  destination: string,
  amount: string,
  memo?: string
): Promise<string> {
  const server = new Horizon.Server(HORIZON_TESTNET);
  const account = await server.loadAccount(sourcePublicKey);
  const usdcAsset = new Asset('USDC', USDC_ISSUER_TESTNET);

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  }).addOperation(
    Operation.payment({ destination, asset: usdcAsset, amount })
  );

  if (memo) {
    builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const transaction = builder.setTimeout(30).build();
  return transaction.toEnvelope().toXDR('base64');
}

export async function verifyUsdcPayment(
  txHash: string,
  recipientAddress: string,
  requiredAmount: string
): Promise<boolean> {
  const server = new Horizon.Server(HORIZON_TESTNET);
  try {
    const ops = await server.operations().forTransaction(txHash).call();
    for (const op of ops.records) {
      if (
        op.type === 'payment' &&
        (op as any).to === recipientAddress &&
        (op as any).asset_code === 'USDC' &&
        (op as any).asset_issuer === USDC_ISSUER_TESTNET &&
        parseFloat((op as any).amount) >= parseFloat(requiredAmount)
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
