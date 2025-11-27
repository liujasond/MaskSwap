import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div>
          <p className="header-eyebrow">Fully Homomorphic Liquidity</p>
          <h1>MaskSwap</h1>
          <p className="header-subtitle">
            Swap ETH into cUSDT while keeping balances encrypted with Zama&apos;s FHE stack.
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
