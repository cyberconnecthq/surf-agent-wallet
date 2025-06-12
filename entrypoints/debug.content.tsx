/** @format */

import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/debug-panel.css";

export default defineContentScript({
    matches: ["<all_urls>"],
    world: "MAIN",
    runAt: "document_end",
    main() {
        createDebugPanel();
        // setupDebugListener();
    },
});

interface DebugCall {
    id: string;
    method: string;
    params: any[];
    status: "pending" | "success" | "error";
    result?: any;
    error?: string;
    timestamp: number;
    duration?: number;
}

const WalletDebugPanel: React.FC = () => {
    const [calls, setCalls] = useState<Map<string, DebugCall>>(new Map());
    const [currentAddress, setCurrentAddress] = useState<string>("Loading...");
    const maxCalls = 1;

    // 获取当前钱包地址
    const fetchCurrentAddress = useCallback(async () => {
        try {
            // 通过消息传递获取当前账户
            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "eth_accounts",
                    params: [],
                    messageId: "debug-panel-get-address-" + Date.now(),
                },
                "*"
            );
        } catch (error) {
            console.error("Failed to fetch current address:", error);
            setCurrentAddress("Unable to fetch address");
        }
    }, []);

    // 监听账户响应和账户变化事件
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
                const { messageId, result } = event.data;
                if (messageId && messageId.startsWith("debug-panel-get-address-")) {
                    if (result && result.length > 0) {
                        setCurrentAddress(result[0]);
                    } else {
                        setCurrentAddress("No account found");
                    }
                }
            }

            // 监听账户变化事件
            if (event.data.type === "WALLET_EVENT" && event.data.event === "accountsChanged") {
                const accounts = event.data.data;
                if (accounts && accounts.length > 0) {
                    setCurrentAddress(accounts[0]);
                } else {
                    setCurrentAddress("No account found");
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // 组件挂载时获取地址
    useEffect(() => {
        fetchCurrentAddress();
    }, [fetchCurrentAddress]);

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

                // 限制最大调用数量
                if (newCalls.size > maxCalls) {
                    const firstKey = Array.from(newCalls.keys())[0];
                    if (firstKey) {
                        newCalls.delete(firstKey);
                    }
                }

                return newCalls;
            });
        },
        [maxCalls]
    );

    const updateCall = useCallback(
        (messageId: string, result?: any, error?: string) => {
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


    function setupDebugListener() {
        // 监听钱包请求
        window.addEventListener("message", (event) => {
            if (event.source !== window) {
                return;
            }

            if (event.data.type === "WALLET_REQUEST_TO_BACKGROUND") {
                console.log("🔍 Debug panel: Got wallet request", event.data);
                const { method, params, messageId } = event.data;
                if (method && params && messageId) {
                    const idStr = String(messageId);
                    addCall(method, params, idStr);
                }
            }

            if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
                console.log("🔍 Debug panel: Got wallet response", event.data);
                const { messageId, result, error } = event.data;
                if (messageId) {
                    const idStr = String(messageId);
                    updateCall(idStr, result, error);
                }
            }
        });
    }


    // 暴露方法给全局使用
    useEffect(() => {
        (window as any).__debugPanel = {
            addCall,
            updateCall,
        };

        setupDebugListener()
    }, [addCall, updateCall]);

    // 缩短地址显示
    const formatAddress = (address: string) => {
        if (address.length <= 20) return address;
        if (address.startsWith("0x") && address.length > 20) {
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
        return address;
    };

    const renderCall = (call: DebugCall) => {
        const timeStr = new Date(call.timestamp).toLocaleTimeString();
        const durationStr = call.duration ? `${call.duration}ms` : "";

        return (
            <div key={call.id} className="wallet-debug-call">
                <div className="wallet-debug-call-header">
                    <span className="wallet-debug-method">{call.method}</span>
                    <div>
                        <span className={`wallet-debug-status ${call.status}`}>
                            {call.status}
                        </span>
                    </div>
                </div>
                <div className="wallet-debug-time">
                    {timeStr} {durationStr}
                </div>
                <div className="wallet-debug-details">
                    {call.result !== undefined && (
                        <div className="wallet-debug-result">
                            ✓ {JSON.stringify(call.result)}
                        </div>
                    )}
                    {call.error && (
                        <div className="wallet-debug-error">
                            ✗ {call.error}
                        </div>
                    )}
                </div>
                {call.params.length > 0 && (
                    <div className="wallet-debug-params">
                        → {JSON.stringify(call.params)}
                    </div>
                )}

            </div>
        );
    };

    const callsArray = Array.from(calls.values()).reverse();

    return (
        <div className="wallet-debug-panel">
            <div className="wallet-debug-header">
                <span title={currentAddress}>
                    Wallet Terminal: {formatAddress(currentAddress)}
                </span>
                {/* <div className="wallet-debug-header-buttons">
                    <button
                        className="wallet-debug-refresh"
                        onClick={fetchCurrentAddress}
                        title="Refresh wallet address"
                    >
                        ↻
                    </button>
                    <button className="wallet-debug-clear" onClick={clearCalls}>
                        Clear
                    </button>
                </div> */}
            </div>
            <div className="wallet-debug-calls">
                {calls.size === 0 ? (
                    <div className="wallet-debug-empty">No calls yet</div>
                ) : (
                    callsArray.map(renderCall)
                )}
            </div>
        </div>
    );
};



function createDebugPanel() {
    // 避免重复创建
    if (document.getElementById("surf-wallet-debug-panel")) {
        return;
    }

    // 创建容器
    const container = document.createElement("div");
    container.id = "surf-wallet-debug-panel";
    document.body.appendChild(container);

    // 使用React渲染
    const root = createRoot(container);
    root.render(<WalletDebugPanel />);
}

// function setupDebugListener() {
//     // 监听钱包请求
//     window.addEventListener("message", (event) => {
//         if (event.source !== window) {
//             return;
//         }

//         if (event.data.type === "WALLET_REQUEST_TO_BACKGROUND") {
//             console.log("🔍 Debug panel: Got wallet request", event.data);
//             const { method, params, messageId } = event.data;
//             if (method && params && messageId) {
//                 const idStr = String(messageId);
//                 (window as any).__debugPanel?.addCall(method, params, idStr);
//             }
//         }

//         if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
//             console.log("🔍 Debug panel: Got wallet response", event.data);
//             const { messageId, result, error } = event.data;
//             if (messageId) {
//                 const idStr = String(messageId);
//                 (window as any).__debugPanel?.updateCall(idStr, result, error);
//             }
//         }
//     });
// } 