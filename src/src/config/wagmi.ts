import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'MaskSwap',
  projectId: '6f3b3bc3df1887eef9806f94a0865d02',
  chains: [sepolia],
  ssr: false,
});
