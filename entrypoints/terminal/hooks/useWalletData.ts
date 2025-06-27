/** @format */

import { useCallback, useState } from "react";
import { DEFAULT_TOKEN_BALANCES, TOKEN_CONTRACTS } from "../constants";
import { WalletState } from "../types";
import {
  createERC20BalanceCallData,
  generateMessageId,
  getNetworkName,
  hexToEth,
  hexToTokenBalance,
  sendWalletRequest,
} from "../utils";

export const useWalletData = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    currentAddress: "Loading...",
    networkInfo: { chainId: "Loading...", chainName: "Loading..." },
    tokenBalances: DEFAULT_TOKEN_BALANCES,
    isConnected: false,
    connectionStatus: "Checking...",
    portfolioValue: "0.00",
  });

  // Check wallet connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        setWalletState((prev) => ({
          ...prev,
          isConnected: false,
          connectionStatus: "Wallet not detected",
        }));
        return;
      }

      sendWalletRequest(
        "eth_accounts",
        [],
        generateMessageId("debug-panel-check-connection")
      );
    } catch (error) {
      console.error("Failed to check connection status:", error);
      setWalletState((prev) => ({
        ...prev,
        isConnected: false,
        connectionStatus: "Connection check failed",
      }));
    }
  }, []);

  // Fetch current wallet address
  const fetchCurrentAddress = useCallback(async () => {
    try {
      sendWalletRequest(
        "eth_accounts",
        [],
        generateMessageId("debug-panel-get-address")
      );
    } catch (error) {
      console.error("Failed to fetch current address:", error);
      setWalletState((prev) => ({
        ...prev,
        currentAddress: "Unable to fetch address",
        isConnected: false,
        connectionStatus: "Failed to fetch address",
      }));
    }
  }, []);

  // Fetch network information
  const fetchNetworkInfo = useCallback(async () => {
    try {
      sendWalletRequest(
        "eth_chainId",
        [],
        generateMessageId("debug-panel-get-chainid")
      );
      sendWalletRequest(
        "wallet_getChainId",
        [],
        generateMessageId("debug-panel-get-network")
      );
    } catch (error) {
      console.error("Failed to fetch network info:", error);
      setWalletState((prev) => ({
        ...prev,
        networkInfo: {
          chainId: "Unable to fetch",
          chainName: "Unable to fetch",
        },
      }));
    }
  }, []);

  // Fetch ETH balance
  const fetchEthBalance = useCallback(async (address: string) => {
    try {
      sendWalletRequest(
        "eth_getBalance",
        [address, "latest"],
        generateMessageId("debug-panel-get-eth-balance")
      );
    } catch (error) {
      console.error("Failed to fetch ETH balance:", error);
    }
  }, []);

  // Fetch ERC-20 token balance
  const fetchTokenBalance = useCallback(
    async (address: string, tokenAddress: string, tokenSymbol: string) => {
      try {
        const data = createERC20BalanceCallData(address);
        sendWalletRequest(
          "eth_call",
          [{ to: tokenAddress, data }, "latest"],
          generateMessageId(
            `debug-panel-get-${tokenSymbol.toLowerCase()}-balance`
          )
        );
      } catch (error) {
        console.error(`Failed to fetch ${tokenSymbol} balance:`, error);
      }
    },
    []
  );

  // Fetch all token balances
  const fetchAllBalances = useCallback(
    (address: string) => {
      fetchEthBalance(address);
      fetchTokenBalance(address, TOKEN_CONTRACTS.CYBER, "CYBER");
      fetchTokenBalance(address, TOKEN_CONTRACTS.BASE_USDT, "USDT");
      fetchTokenBalance(address, TOKEN_CONTRACTS.BASE_USDC, "USDC");
    },
    [fetchEthBalance, fetchTokenBalance]
  );

  // Update wallet address
  const updateAddress = useCallback(
    (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletState((prev) => ({
          ...prev,
          currentAddress: address,
          isConnected: true,
          connectionStatus: "Connected",
        }));
        fetchAllBalances(address);
      } else {
        setWalletState((prev) => ({
          ...prev,
          currentAddress: "No account found",
          isConnected: false,
          connectionStatus: "No account found",
        }));
      }
    },
    [fetchAllBalances]
  );

  // Update network info
  const updateNetworkInfo = useCallback((chainId: string) => {
    const chainName = getNetworkName(chainId);
    setWalletState((prev) => ({
      ...prev,
      networkInfo: {
        chainId: parseInt(chainId, 16).toString(),
        chainName,
      },
    }));
  }, []);

  // Update token balance
  const updateTokenBalance = useCallback(
    (tokenSymbol: string, balance: string, decimals?: number) => {
      setWalletState((prev) => ({
        ...prev,
        tokenBalances: prev.tokenBalances.map((token) => {
          if (token.symbol === tokenSymbol) {
            let formattedBalance: string;
            if (tokenSymbol === "ETH") {
              formattedBalance = hexToEth(balance);
            } else {
              formattedBalance = hexToTokenBalance(balance, decimals);
            }
            return { ...token, balance: formattedBalance };
          }
          return token;
        }),
      }));
    },
    []
  );

  // Set connection status
  const setConnectionStatus = useCallback(
    (status: boolean, message: string) => {
      setWalletState((prev) => ({
        ...prev,
        isConnected: status,
        connectionStatus: message,
      }));
    },
    []
  );

  // Calculate portfolio value
  const calculatePortfolioValue = useCallback(() => {
    setWalletState((prev) => {
      const total = prev.tokenBalances.reduce((sum, token) => {
        const balance = parseFloat(token.balance);
        const usdValue = parseFloat(token.usdValue || "0");
        return (
          sum +
          (isNaN(balance) ? 0 : balance * (isNaN(usdValue) ? 0 : usdValue))
        );
      }, 0);

      return {
        ...prev,
        portfolioValue: total.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
    });
  }, []);

  return {
    walletState,
    checkConnectionStatus,
    fetchCurrentAddress,
    fetchNetworkInfo,
    updateAddress,
    updateNetworkInfo,
    updateTokenBalance,
    setConnectionStatus,
    calculatePortfolioValue,
    fetchAllBalances,
  };
};
