/** @format */

import { useEffect } from "react";
import { MessageData } from "../types";
import { useDebugCalls } from "./useDebugCalls";
import { useWalletData } from "./useWalletData";

export const useMessageListener = (
  walletHook: ReturnType<typeof useWalletData>,
  debugHook: ReturnType<typeof useDebugCalls>
) => {
  const {
    updateAddress,
    updateNetworkInfo,
    updateTokenBalance,
    setConnectionStatus,
    fetchAllBalances,
    walletState,
  } = walletHook;

  const { handleWalletRequest, handleWalletResponse } = debugHook;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      const data: MessageData = event.data;

      // Handle wallet responses
      if (data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
        const { messageId, result, error } = data;

        // Handle debug calls
        handleWalletResponse(data);

        if (!messageId) return;

        // Check connection status response
        if (messageId.startsWith("debug-panel-check-connection-")) {
          if (result && result.length > 0) {
            setConnectionStatus(true, "Connected");
          } else {
            setConnectionStatus(false, "Not connected");
          }
        }

        // Handle address response
        if (messageId.startsWith("debug-panel-get-address-")) {
          updateAddress(result || []);
        }

        // Handle chain ID response
        if (messageId.startsWith("debug-panel-get-chainid-")) {
          if (result) {
            updateNetworkInfo(result);
          }
        }

        // Handle ETH balance response
        if (messageId.startsWith("debug-panel-get-eth-balance-")) {
          if (result) {
            updateTokenBalance("ETH", result);
          } else if (error) {
            updateTokenBalance("ETH", "Error");
          }
        }

        // Handle CYBER balance response
        if (messageId.startsWith("debug-panel-get-cyber-balance-")) {
          if (result) {
            updateTokenBalance("CYBER", result, 18);
          } else if (error) {
            console.error("CYBER balance error:", error);
            updateTokenBalance("CYBER", "Error");
          }
        }

        // Handle USDT balance response
        if (messageId.startsWith("debug-panel-get-usdt-balance-")) {
          if (result) {
            updateTokenBalance("USDT", result, 6);
          } else if (error) {
            console.error("USDT balance error:", error);
            updateTokenBalance("USDT", "Error");
          }
        }

        // Handle USDC balance response
        if (messageId.startsWith("debug-panel-get-usdc-balance-")) {
          if (result) {
            updateTokenBalance("USDC", result, 6);
          } else if (error) {
            console.error("USDC balance error:", error);
            updateTokenBalance("USDC", "Error");
          }
        }
      }

      // Handle wallet requests
      if (data.type === "WALLET_REQUEST_TO_BACKGROUND") {
        handleWalletRequest(data);
      }

      // Handle wallet events
      if (data.type === "WALLET_EVENT") {
        const { event, data: eventData } = data;

        switch (event) {
          case "accountsChanged":
            updateAddress(eventData || []);
            break;

          case "chainChanged":
            if (eventData) {
              updateNetworkInfo(eventData);
              // Refresh balances when chain changes
              if (
                walletState.currentAddress &&
                walletState.currentAddress !== "Loading..." &&
                walletState.currentAddress !== "No account found"
              ) {
                fetchAllBalances(walletState.currentAddress);
              }
            }
            break;

          case "connect":
            setConnectionStatus(true, "Connected");
            break;

          case "disconnect":
            setConnectionStatus(false, "Disconnected");
            updateAddress([]);
            break;

          default:
            break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    updateAddress,
    updateNetworkInfo,
    updateTokenBalance,
    setConnectionStatus,
    fetchAllBalances,
    handleWalletRequest,
    handleWalletResponse,
    walletState.currentAddress,
  ]);

  // Setup debug panel global functions
  useEffect(() => {
    (window as any).__debugPanel = {
      addCall: debugHook.addCall,
      updateCall: debugHook.updateCall,
    };
  }, [debugHook.addCall, debugHook.updateCall]);
};
