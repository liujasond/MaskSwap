import { useCallback, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Header } from './Header';
import { SwapPanel } from './SwapPanel';
import { BalancePanel } from './BalancePanel';
import { MASK_SWAP_ABI, MASK_SWAP_ADDRESS } from '../config/contracts';
import '../styles/MaskSwapApp.css';

export function MaskSwapApp() {
  const { address, isConnected } = useAccount();
  const hasWallet = useMemo(() => Boolean(address && isConnected), [address, isConnected]);

  const {
    data: encryptedBalanceData,
    error: encryptedBalanceError,
    refetch: refetchBalance,
    isFetching: isBalanceFetching,
  } = useReadContract({
    address: MASK_SWAP_ADDRESS as `0x${string}`,
    abi: MASK_SWAP_ABI,
    functionName: 'cusdtBalance',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const handleSwapComplete = useCallback(() => {
    if (address) {
      void refetchBalance();
    }
  }, [address, refetchBalance]);

  const handleManualRefresh = useCallback(() => {
    if (address) {
      void refetchBalance();
    }
  }, [address, refetchBalance]);

  const encryptedBalance = encryptedBalanceData ? (encryptedBalanceData as string) : null;
  const balanceErrorMessage = encryptedBalanceError ? encryptedBalanceError.message : null;

  return (
    <div className="mask-app">
      <Header />
      <main className="app-body">
        <section className="swap-section">
          <SwapPanel isWalletReady={hasWallet} onSwapComplete={handleSwapComplete} />
          <div className="info-card">
            <h3>Fixed Conversion</h3>
            <p>Every swap mints cUSDT at a fixed price of 1 ETH = 3300 cUSDT (6 decimals).</p>
            <ul>
              <li>No slippage or liquidity surprises.</li>
              <li>Confidential balances secured by FHE.</li>
              <li>Transactions execute on Sepolia via MaskSwap.</li>
            </ul>
          </div>
        </section>
        <section className="balance-section">
          <BalancePanel
            address={address}
            encryptedBalance={encryptedBalance}
            errorMessage={balanceErrorMessage}
            isLoading={isBalanceFetching}
            isWalletReady={hasWallet}
            onRefresh={handleManualRefresh}
          />
        </section>
      </main>
    </div>
  );
}
