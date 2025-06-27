/** @format */

import { useCallback, useState } from "react";
import { CONFIG } from "../constants";
import { DebugCall } from "../types";
import { isDebugPanelMessage } from "../utils";

export const useDebugCalls = () => {
  const [calls, setCalls] = useState<Map<string, DebugCall>>(new Map());

  const addCall = useCallback(
    (method: string, params: any[], messageId: string) => {
      const call: DebugCall = {
        id: messageId,
        method,
        params,
        status: "pending",
        timestamp: Date.now(),
      };

      setCalls((prevCalls) => {
        const newCalls = new Map(prevCalls);
        newCalls.set(messageId, call);

        // Limit the number of calls displayed
        if (newCalls.size > CONFIG.MAX_CALLS) {
          const firstKey = Array.from(newCalls.keys())[0];
          if (firstKey) {
            newCalls.delete(firstKey);
          }
        }

        return newCalls;
      });
    },
    []
  );

  const updateCall = useCallback(
    (messageId: string, result?: any, error?: string) => {
      // Skip unsupported method errors
      if (error && error.toLowerCase().includes("supported")) {
        return;
      }

      setCalls((prevCalls) => {
        const call = prevCalls.get(messageId);
        if (call) {
          const newCalls = new Map(prevCalls);
          const updatedCall = {
            ...call,
            status: error ? ("error" as const) : ("success" as const),
            result,
            error,
            duration: Date.now() - call.timestamp,
          };
          newCalls.set(messageId, updatedCall);
          return newCalls;
        }
        return prevCalls;
      });
    },
    []
  );

  const handleWalletRequest = useCallback(
    (data: any) => {
      const { method, params, messageId } = data;
      if (method && params && messageId) {
        const idStr = String(messageId);
        if (!isDebugPanelMessage(idStr)) {
          addCall(method, params, idStr);
        }
      }
    },
    [addCall]
  );

  const handleWalletResponse = useCallback(
    (data: any) => {
      const { messageId, result, error } = data;
      if (messageId) {
        const idStr = String(messageId);
        if (!isDebugPanelMessage(idStr)) {
          updateCall(idStr, result, error);
        }
      }
    },
    [updateCall]
  );

  return {
    calls,
    addCall,
    updateCall,
    handleWalletRequest,
    handleWalletResponse,
  };
};
