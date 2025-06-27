/** @format */

import cyberIcon from "../../assets/tokens/cyber.png";
import ethIcon from "../../assets/tokens/eth.png";
import usdcIcon from "../../assets/tokens/usdc.png";
import usdtIcon from "../../assets/tokens/usdt.png";

// Token contract addresses
export const TOKEN_CONTRACTS = {
  CYBER: "0x14778860E937f509e651192a90589dE711Fb88a9",
  BASE_USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  BASE_USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const;

// Token icons
export const TOKEN_ICONS = {
  ETH: ethIcon,
  CYBER: cyberIcon,
  USDT: usdtIcon,
  USDC: usdcIcon,
} as const;

// Network mappings
export const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  5: "Goerli Testnet",
  11155111: "Sepolia Testnet",
  137: "Polygon Mainnet",
  56: "BSC Mainnet",
  10: "Optimism",
  42161: "Arbitrum One",
  7560: "Cyber Mainnet",
  111557560: "Cyber Testnet",
  8453: "Base Mainnet",
};

// Default token balances
export const DEFAULT_TOKEN_BALANCES = [
  {
    symbol: "ETH",
    balance: "Loading...",
    icon: TOKEN_ICONS.ETH,
    usdValue: "0.00",
  },
  {
    symbol: "CYBER",
    balance: "Loading...",
    icon: TOKEN_ICONS.CYBER,
    usdValue: "0.00",
  },
  {
    symbol: "USDT",
    balance: "Loading...",
    icon: TOKEN_ICONS.USDT,
    usdValue: "0.00",
  },
  {
    symbol: "USDC",
    balance: "Loading...",
    icon: TOKEN_ICONS.USDC,
    usdValue: "0.00",
  },
];

// Configuration
export const CONFIG = {
  MAX_CALLS: 5,
  ERC20_BALANCE_FUNCTION_SELECTOR: "0x70a08231",
} as const;
