import { useMemo, useState } from 'react';
import { useReadContract } from 'wagmi';
import { Contract, parseEther } from 'ethers';
import { MASK_SWAP_ABI, MASK_SWAP_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { formatCusdt } from '../utils/format';
import '../styles/SwapPanel.css';

type SwapPanelProps = {
  isWalletReady: boolean;
  onSwapComplete: () => void;
};

const RATE = 3300;

export function SwapPanel({ isWalletReady, onSwapComplete }: SwapPanelProps) {
  const signer = useEthersSigner();
  const [ethAmount, setEthAmount] = useState('0.1');
  const [swapStatus, setSwapStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const parsedAmount = useMemo(() => {
    if (!ethAmount) {
      return { value: null as bigint | null, error: null as string | null };
    }
    try {
      return { value: parseEther(ethAmount), error: null as string | null };
    } catch (error) {
      return { value: null as bigint | null, error: 'Enter a valid ETH amount' };
    }
  }, [ethAmount]);

  const shouldFetchPreview = Boolean(parsedAmount.value && parsedAmount.value > 0n);

  const {
    data: previewData,
    error: previewError,
    isFetching: isPreviewLoading,
  } = useReadContract({
    address: MASK_SWAP_ADDRESS as `0x${string}`,
    abi: MASK_SWAP_ABI,
    functionName: 'previewSwap',
    args: shouldFetchPreview && parsedAmount.value ? [parsedAmount.value] : undefined,
    query: {
      enabled: shouldFetchPreview,
    },
  });

  const previewErrorMessage = parsedAmount.error
    ? parsedAmount.error
    : previewError
    ? 'Preview unavailable. Check the amount.'
    : null;

  const estimatedCusdt = previewData ? formatCusdt(previewData as bigint) : '0.000000';

  const canSwap = useMemo(() => {
    return isWalletReady && shouldFetchPreview && swapStatus !== 'pending';
  }, [isWalletReady, shouldFetchPreview, swapStatus]);

  const handleSwap = async () => {
    if (!isWalletReady) {
      setSwapStatus('error');
      setStatusMessage('Connect your wallet to start swapping.');
      return;
    }

    try {
      const weiValue = parsedAmount.value;
      if (!weiValue || weiValue <= 0n) {
        setSwapStatus('error');
        setStatusMessage('Enter a valid ETH amount.');
        return;
      }

      setSwapStatus('pending');
      setStatusMessage('Confirm the transaction in your wallet...');
      setTxHash(null);

      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Wallet signer is not available.');
      }

      const contract = new Contract(MASK_SWAP_ADDRESS, MASK_SWAP_ABI, resolvedSigner);
      const tx = await contract.swap({ value: weiValue });
      setTxHash(tx.hash);
      setStatusMessage('Waiting for Sepolia confirmation...');
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        setSwapStatus('success');
        setStatusMessage('Swap confirmed. Your cUSDT is on-chain!');
        onSwapComplete();
      } else {
        setSwapStatus('error');
        setStatusMessage('Swap reverted on-chain.');
      }
    } catch (error) {
      console.error('Swap failed', error);
      setSwapStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Swap failed.');
    }
  };

  return (
    <div className="swap-card">
      <div className="swap-card-header">
        <div>
          <h2>MaskSwap</h2>
          <p>Convert ETH into confidential cUSDT at a guaranteed rate.</p>
        </div>
        <div className="rate-pill">1 ETH = {RATE} cUSDT</div>
      </div>

      <label className="field-label">Amount in ETH</label>
      <input
        type="number"
        min="0"
        step="0.001"
        value={ethAmount}
        onChange={(event) => setEthAmount(event.target.value)}
        className="eth-input"
        placeholder="0.10"
      />

      <div className="preview-row">
        <div>
          <p className="field-label">Estimated cUSDT</p>
          <p className="preview-value">{isPreviewLoading ? 'Calculating...' : `${estimatedCusdt} cUSDT`}</p>
        </div>
        {previewErrorMessage ? <span className="error-text">{previewErrorMessage}</span> : null}
      </div>

      <button className="swap-button" onClick={handleSwap} disabled={!canSwap}>
        {!isWalletReady ? 'Connect wallet to swap' : swapStatus === 'pending' ? 'Swapping...' : 'Swap for cUSDT'}
      </button>

      <div className="status-area">
        {statusMessage ? (
          <p className={`status-message status-${swapStatus}`}>{statusMessage}</p>
        ) : (
          <p className="status-message">
            You are swapping on Sepolia. Gas fees are paid in test ETH.
          </p>
        )}
        {txHash ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="tx-link"
          >
            View transaction →
          </a>
        ) : null}
      </div>

      <div className="helper-text">
        <p>
          MaskSwap mints cUSDT directly to your wallet. Balances remain encrypted on-chain and can only be decrypted by
          you.
        </p>
        <p className="hint">
          Need Sepolia ETH? Request it from{' '}
          <a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer">
            a public faucet
          </a>
          .
        </p>
      </div>
    </div>
  );
}
