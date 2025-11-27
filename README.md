# MaskSwap

MaskSwap is a confidential ETH → cUSDT swap that runs on Sepolia using Zama's FHEVM. Users trade ETH at a guaranteed rate of `1 ETH = 3300 cUSDT` while keeping balances encrypted on-chain. The front end lets wallets preview the swap output, execute the transaction, and locally decrypt their cUSDT balance through the Zama relayer.

## Why MaskSwap
- Confidential by default: balances stay encrypted on-chain (ERC7984) and are only decrypted client-side by the owner.
- Deterministic pricing: fixed 1:3300 rate with a pure preview function and no slippage/lp math.
- Simple UX: one-click swap with RainbowKit, ethers for writes, viem for reads, and an inline decryption flow.
- Production-like flow: live Sepolia deployment, real ABI pulled from `deployments/sepolia`, no mock data.

## What it solves
- Stablecoin acquisition without revealing position sizes on-chain.
- Removes AMM complexity (price impact, liquidity depths) for a single-asset mint.
- Lets users prove ownership of balances privately and reveal amounts only when they choose.
- Provides an FHE reference for encrypted balances with user-side decryption.

## Core features
- Fixed-rate swap: `swap()` mints cUSDT for ETH; `previewSwap()` shows the exact output up-front.
- Confidential balances: `cusdtBalance(address)` returns an encrypted `euint64`; balances never appear in plaintext on-chain.
- Owner treasury controls: collected ETH can be withdrawn by the owner via `withdrawETH`.
- Frontend flows: connect wallet → preview → swap via ethers → refresh encrypted balance via viem → decrypt locally with Zama relayer.
- Sepolia addresses baked in for production-like usage (see **Deployments**).

## Architecture & tech stack
- Smart contracts: Hardhat, Solidity 0.8.27, `@fhevm/solidity`, `confidential-contracts-v91`, OpenZeppelin Ownable + ReentrancyGuard.
- FHE tooling: ZamaEthereumConfig for protocol wiring, `euint64` balances, encrypted minting.
- Tasks & deployment: `hardhat-deploy`, custom tasks under `tasks/` for swapping and decrypting.
- Frontend: React + Vite + RainbowKit + wagmi (viem for reads) + ethers (writes) + `@zama-fhe/relayer-sdk` for user decryption. No environment variables; Sepolia-only network configuration.
- Package management: npm (do not edit `package.json` files).

## Contracts
- `contracts/MaskSwap.sol`: fixed-rate ETH → cUSDT swap, encrypted balance getter, owner ETH withdrawals.
- `contracts/ConfidentialUSDT.sol`: ERC7984-based confidential token (6 decimals, mint callable by MaskSwap). The cUSDT contract itself is immutable in this repo.
- `deploy/deploy.ts`: deploys cUSDT then MaskSwap with the cUSDT address injected.
- `test/MaskSwap.ts`: FHEVM-mock unit tests covering preview, swap + decrypt, zero-value guard, and withdrawals.

## Deployments (Sepolia)
- MaskSwap: `0xA3D4C7Ea9f1331F72488DEA70bf9779476723d85`
- ConfidentialUSDT: `0xea583c5f37Ac194483360353e01283f3611A29d1`
- ABI sources: `deployments/sepolia/MaskSwap.json`, `deployments/sepolia/ConfidentialUSDT.json` (copied into `src/src/config/contracts.ts` for the frontend).

## Repository layout
- `contracts/` — Solidity sources.
- `deploy/` — hardhat-deploy scripts.
- `tasks/` — CLI helpers (`task:contracts`, `task:swap`, `task:decrypt-balance`).
- `test/` — Hardhat tests (FHEVM mock).
- `deployments/` — network artifacts and ABIs.
- `src/` — frontend (React + Vite, Wagmi/RainbowKit, Zama relayer integration). Do not import from repo root.
- `docs/` — Zama protocol and relayer references.

## Getting started
Prerequisites:
- Node.js ≥ 20 and npm ≥ 7
- A Sepolia RPC key (Infura) and a funded Sepolia private key for deployments; no mnemonics.

Install dependencies:
```bash
npm install          # root (Hardhat + contracts)
cd src && npm install  # frontend
```

Environment (root `.env`):
```bash
PRIVATE_KEY=0x...       # Sepolia deployer key
INFURA_API_KEY=...      # used in hardhat.config.ts
ETHERSCAN_API_KEY=...   # optional, for verification
```

## Development workflow
- Compile: `npm run compile`
- Test: `npm test` (runs on the FHEVM mock; tests skip if the mock is unavailable)
- Local node: `npm run chain` (Hardhat node); deploy locally with `npm run deploy:localhost`
- Sepolia deploy: `npm run deploy:sepolia` (uses `PRIVATE_KEY` + `INFURA_API_KEY`)
- Verify: `npm run verify:sepolia`

Handy tasks:
- `npx hardhat task:contracts --network sepolia` — print deployed addresses.
- `npx hardhat task:swap --eth 0.1 --network sepolia` — swap via CLI.
- `npx hardhat task:decrypt-balance --address <addr> --network sepolia` — decrypt a wallet’s cUSDT.

## Frontend usage
1) From `src/`: `npm run dev` and open the Vite URL.  
2) Connect a Sepolia wallet via RainbowKit.  
3) Enter ETH amount, preview cUSDT output (fixed rate), and swap (ethers write).  
4) Refresh the encrypted balance (viem read) and click **Decrypt balance** to re-encrypt for your NaCl key via the Zama relayer SDK.  
5) View the plaintext cUSDT amount locally; it is never exposed on-chain.

Notes:
- The frontend hardcodes Sepolia and the addresses from `deployments/sepolia`. Update `src/src/config/contracts.ts` if contracts are redeployed.
- Reads use viem; writes use ethers to comply with project requirements.
- No mocks or local RPCs are used in the UI; avoid localhost networks and localStorage.

## Security & privacy considerations
- Balances are stored as encrypted `euint64` values; only the holder can decrypt via relayer-assisted re-encryption.
- `previewSwap` is pure and does not read caller context (no `msg.sender` in views).
- `swap` is non-reentrant and reverts on zero-value input or overflow; owner withdrawals are validated for balance and non-zero receiver.
- Keep private keys and RPC keys in `.env`; never commit them.

## Future work
- Dynamic pricing or oracle-driven rates while keeping encrypted balances.
- Additional assets (multi-stable, ETH → cTokens) and dual-direction swaps.
- UI enhancements: historical swaps feed, relayer status surface, gas estimation.
- Extended ops: operator roles for ETH treasury management, monitoring dashboards, and automated alerts.
- Security: third-party audits, fuzzing, and formal verification of FHE flows.

## License
BSD-3-Clause-Clear. See `LICENSE`.
