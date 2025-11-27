import { useEffect, useMemo, useState } from 'react';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CUSDT_ADDRESS } from '../config/contracts';
import { formatCusdt, shortHex } from '../utils/format';
import '../styles/BalancePanel.css';

type BalancePanelProps = {
  address?: `0x${string}` | string | undefined;
  encryptedBalance: string | null;
  errorMessage: string | null;
  isLoading: boolean;
  isWalletReady: boolean;
  onRefresh: () => void;
};

export function BalancePanel({
  address,
  encryptedBalance,
  errorMessage,
  isLoading,
  isWalletReady,
  onRefresh,
}: BalancePanelProps) {
  const signer = useEthersSigner();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const hasCiphertext = useMemo(() => Boolean(encryptedBalance), [encryptedBalance]);

  useEffect(() => {
    setDecryptedValue(null);
    setDecryptError(null);
  }, [encryptedBalance]);

  const handleDecrypt = async () => {
    if (!instance) {
      setDecryptError('Encryption runtime not initialized yet.');
      return;
    }
    if (!signer) {
      setDecryptError('Connect a wallet to decrypt balances.');
      return;
    }
    if (!encryptedBalance || !address) {
      setDecryptError('Nothing to decrypt yet.');
      return;
    }

    try {
      setDecrypting(true);
      setDecryptError(null);
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedBalance,
          contractAddress: CUSDT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CUSDT_ADDRESS];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Wallet signer missing.');
      }

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decrypted = result[encryptedBalance] ?? '0';
      const formatted = formatCusdt(BigInt(decrypted));
      setDecryptedValue(formatted);
    } catch (error) {
      console.error('Failed to decrypt balance', error);
      setDecryptError(error instanceof Error ? error.message : 'Failed to decrypt balance.');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="balance-card">
      <h2>Your cUSDT Balance</h2>
      <p className="balance-description">
        Balances are stored as encrypted ciphertexts on-chain. You can decrypt them locally using the Zama Relayer.
      </p>

      <div className="cipher-block">
        <div>
          <span className="field-label">Encrypted handle</span>
          {isLoading ? (
            <p className="cipher-value">Loading...</p>
          ) : errorMessage ? (
            <p className="cipher-value error-text">{errorMessage}</p>
          ) : hasCiphertext ? (
            <p className="cipher-value">{shortHex(encryptedBalance, 10)}</p>
          ) : (
            <p className="cipher-value muted">No swaps on this wallet yet.</p>
          )}
        </div>
        <button className="refresh-button" type="button" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      </div>

      <div className="decryption-area">
        <div className="decryption-info">
          <p className="field-label">Decrypted balance</p>
          {decryptedValue ? (
            <p className="decrypted-value">{decryptedValue} cUSDT</p>
          ) : (
            <p className="decrypted-value muted">Decrypt to reveal the amount</p>
          )}
        </div>
        <button
          className="decrypt-button"
          type="button"
          onClick={handleDecrypt}
          disabled={!isWalletReady || !hasCiphertext || decrypting || isZamaLoading}
        >
          {!isWalletReady
            ? 'Connect wallet'
            : isZamaLoading
            ? 'Starting relayer...'
            : decrypting
            ? 'Decrypting...'
            : 'Decrypt balance'}
        </button>
      </div>

      {decryptError ? <p className="error-text">{decryptError}</p> : null}
      {zamaError ? <p className="error-text">{zamaError}</p> : null}

      <ul className="balance-hints">
        <li>Zama Relayer re-encrypts balances so only your NaCl key can read them.</li>
        <li>Decryption requests are authorized with an EIP-712 signature from your wallet.</li>
        <li>cUSDT keeps 6 decimals. For example, 3300 cUSDT is stored as 3,300,000,000 units.</li>
      </ul>
    </div>
  );
}
