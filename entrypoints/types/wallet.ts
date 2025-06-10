/** @format */

export interface WalletAccount {
  address: string;
  privateKey: string;
  name: string;
  balance: string;
}

export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  currency: string;
  blockExplorerUrl: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  timestamp: number;
  status: "pending" | "success" | "failed";
}

export interface WalletState {
  isUnlocked: boolean;
  accounts: WalletAccount[];
  currentAccountIndex: number;
  currentNetwork: Network;
  transactions: Transaction[];
  password?: string;
}

export const NETWORKS: Network[] = [
  {
    chainId: 7560,
    name: "Cyber Mainnet",
    rpcUrl: "https://cyber.alt.technology",
    currency: "ETH",
    blockExplorerUrl: "https://cyberscan.co",
  },
  {
    chainId: 111557560,
    name: "Cyber Testnet",
    rpcUrl: "https://cyber-testnet.alt.technology/",
    currency: "ETH",
    blockExplorerUrl: "https://testnet.cyberscan.co",
  },
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    currency: "ETH",
    blockExplorerUrl: "https://etherscan.io",
  },
  {
    chainId: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://developer-access-mainnet.base.org",
    currency: "ETH",
    blockExplorerUrl: "https://basescan.org",
  },
  // {
  //   chainId: 5,
  //   name: "Goerli Testnet",
  //   rpcUrl: "https://goerli.infura.io/v3/YOUR_PROJECT_ID",
  //   currency: "ETH",
  //   blockExplorerUrl: "https://goerli.etherscan.io",
  // },
  {
    chainId: 137,
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    currency: "MATIC",
    blockExplorerUrl: "https://polygonscan.com",
  },
];
