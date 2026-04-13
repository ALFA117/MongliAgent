import { useState, useCallback } from 'react';
import {
  isConnected,
  isAllowed,
  setAllowed,
  getPublicKey,
  signTransaction,
} from '@stellar/freighter-api';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

export type FreighterStatus = 'idle' | 'connecting' | 'connected' | 'not_installed' | 'error';

export interface UseFreighterReturn {
  publicKey: string | null;
  status: FreighterStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndSubmit: (xdr: string) => Promise<string>; // devuelve txHash
}

export function useFreighter(): UseFreighterReturn {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<FreighterStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const connected = await isConnected();
      if (!connected) {
        setStatus('not_installed');
        setError('Freighter no está instalado. Instálalo en freighter.app');
        return;
      }

      // Pedir permiso si aún no lo tiene
      const allowed = await isAllowed();
      if (!allowed) {
        await setAllowed();
      }

      const pk = await getPublicKey();
      setPublicKey(pk);
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(String(err));
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setStatus('idle');
    setError(null);
  }, []);

  /**
   * Firma un XDR con Freighter y lo envía directamente a Stellar Horizon Testnet.
   * Devuelve el txHash de la transacción confirmada.
   */
  const signAndSubmit = useCallback(async (xdr: string): Promise<string> => {
    if (!publicKey) throw new Error('Wallet no conectada');

    // 1. Firmar con Freighter (v2 API: opts como objeto)
    const signedXdr = await signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      network: 'TESTNET',
    });

    // 2. Enviar a Horizon Testnet
    const body = new URLSearchParams({ tx: signedXdr });
    const res = await fetch(`${HORIZON_TESTNET}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json() as { hash?: string; title?: string; extras?: { result_codes?: unknown } };
    if (!res.ok || !data.hash) {
      const reason = data.title ?? JSON.stringify(data.extras?.result_codes ?? data);
      throw new Error(`Stellar rechazó la tx: ${reason}`);
    }

    return data.hash;
  }, [publicKey]);

  return { publicKey, status, error, connect, disconnect, signAndSubmit };
}
