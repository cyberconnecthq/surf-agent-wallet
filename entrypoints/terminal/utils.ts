/** @format */

import { CONFIG, NETWORK_NAMES } from "./constants";

/**
 * Convert hex balance to ETH format
 */
export const hexToEth = (hexBalance: string): string => {
  try {
    const weiBalance = parseInt(hexBalance, 16);
    const ethBalance = weiBalance / Math.pow(10, 18);

    if (ethBalance < 0.001) {
      return ethBalance.toFixed(8);
    } else if (ethBalance < 1) {
      return ethBalance.toFixed(6);
    } else {
      return ethBalance.toFixed(4);
    }
  } catch (error) {
    return "0.0000";
  }
};

/**
 * Convert hex balance to token balance
 */
export const hexToTokenBalance = (
  hexBalance: string,
  decimals: number = 18
): string => {
  try {
    if (!hexBalance || hexBalance === "0x" || hexBalance === "0x0") {
      return "0.0000";
    }

    const balance = parseInt(hexBalance, 16);
    const tokenBalance = balance / Math.pow(10, decimals);

    if (tokenBalance === 0) {
      return "0.0000";
    } else if (tokenBalance < 0.001) {
      return tokenBalance.toFixed(8);
    } else if (tokenBalance < 1) {
      return tokenBalance.toFixed(6);
    } else if (tokenBalance < 1000) {
      return tokenBalance.toFixed(4);
    } else {
      return tokenBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  } catch (error) {
    console.error("Error converting hex to token balance:", error);
    return "0.0000";
  }
};

/**
 * Get network name from chain ID
 */
export const getNetworkName = (chainId: string): string => {
  const chainIdNum = parseInt(chainId, 16);
  return NETWORK_NAMES[chainIdNum] || `Chain ${chainIdNum}`;
};

/**
 * Format address for display
 */
export const formatAddress = (address: string): string => {
  if (address.length <= 20) return address;
  if (address.startsWith("0x") && address.length > 20) {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }
  return address;
};

/**
 * Generate message ID for wallet requests
 */
export const generateMessageId = (prefix: string): string => {
  return `${prefix}-${Date.now()}`;
};

/**
 * Create ERC-20 balance call data
 */
export const createERC20BalanceCallData = (address: string): string => {
  const functionSelector = CONFIG.ERC20_BALANCE_FUNCTION_SELECTOR;
  const paddedAddress = address.slice(2).padStart(64, "0");
  return functionSelector + paddedAddress;
};

/**
 * Send wallet request message
 */
export const sendWalletRequest = (
  method: string,
  params: any[],
  messageId: string
): void => {
  window.postMessage(
    {
      type: "WALLET_REQUEST_TO_BACKGROUND",
      method,
      params,
      messageId,
    },
    "*"
  );
};

/**
 * Check if message ID is from debug panel
 */
export const isDebugPanelMessage = (messageId: string): boolean => {
  return String(messageId).startsWith("debug-panel-");
};
