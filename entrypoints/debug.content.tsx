/** @format */

import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import cyberIcon from "../assets/tokens/cyber.png";
import ethIcon from "../assets/tokens/eth.png";
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

interface NetworkInfo {
    chainId: string;
    chainName: string;
}

interface TokenBalance {
    symbol: string;
    balance: string;
    icon: string;
}

const WalletDebugPanel: React.FC = () => {
    const [calls, setCalls] = useState<Map<string, DebugCall>>(new Map());
    const [currentAddress, setCurrentAddress] = useState<string>("Loading...");
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
        chainId: "Loading...",
        chainName: "Loading..."
    });
    const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([
        { symbol: "ETH", balance: "Loading...", icon: ethIcon },
        { symbol: "CYBER", balance: "Loading...", icon: cyberIcon }
    ]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionStatus, setConnectionStatus] = useState<string>("Checking...");
    const maxCalls = 1;

    // 检查钱包连接状态
    const checkConnectionStatus = useCallback(async () => {
        try {
            // 检查是否有可用的钱包
            if (typeof window.ethereum === 'undefined') {
                setIsConnected(false);
                setConnectionStatus("Wallet not detected");
                return;
            }

            // 检查是否已连接
            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "eth_accounts",
                    params: [],
                    messageId: "debug-panel-check-connection-" + Date.now(),
                },
                "*"
            );
        } catch (error) {
            console.error("Failed to check connection status:", error);
            setIsConnected(false);
            setConnectionStatus("Connection check failed");
        }
    }, []);

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
            setIsConnected(false);
            setConnectionStatus("Failed to fetch address");
        }
    }, []);

    // 获取网络信息
    const fetchNetworkInfo = useCallback(async () => {
        try {
            // 获取链ID
            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "eth_chainId",
                    params: [],
                    messageId: "debug-panel-get-chainid-" + Date.now(),
                },
                "*"
            );

            // 获取网络信息
            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "wallet_getChainId",
                    params: [],
                    messageId: "debug-panel-get-network-" + Date.now(),
                },
                "*"
            );
        } catch (error) {
            console.error("Failed to fetch network info:", error);
            setNetworkInfo({
                chainId: "Unable to fetch",
                chainName: "Unable to fetch"
            });
        }
    }, []);

    // 获取ETH余额
    const fetchEthBalance = useCallback(async (address: string) => {
        try {
            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "eth_getBalance",
                    params: [address, "latest"],
                    messageId: "debug-panel-get-eth-balance-" + Date.now(),
                },
                "*"
            );
        } catch (error) {
            console.error("Failed to fetch ETH balance:", error);
        }
    }, []);

    // 获取ERC-20代币余额
    const fetchTokenBalance = useCallback(async (address: string, tokenAddress: string, tokenSymbol: string) => {
        try {
            // 构造 balanceOf(address) 的函数调用数据
            // balanceOf 函数签名: balanceOf(address) -> 0x70a08231
            const functionSelector = "0x70a08231";
            const paddedAddress = address.slice(2).padStart(64, '0'); // 移除0x前缀并填充到64位
            const data = functionSelector + paddedAddress;

            window.postMessage(
                {
                    type: "WALLET_REQUEST_TO_BACKGROUND",
                    method: "eth_call",
                    params: [
                        {
                            to: tokenAddress,
                            data: data
                        },
                        "latest"
                    ],
                    messageId: `debug-panel-get-${tokenSymbol.toLowerCase()}-balance-${Date.now()}`,
                },
                "*"
            );
        } catch (error) {
            console.error(`Failed to fetch ${tokenSymbol} balance:`, error);
        }
    }, []);

    // 将十六进制余额转换为ETH
    const hexToEth = (hexBalance: string): string => {
        try {
            const weiBalance = parseInt(hexBalance, 16);
            const ethBalance = weiBalance / Math.pow(10, 18);

            // 如果余额很小，显示更多小数位
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

    // 将十六进制余额转换为代币余额（考虑小数位数）
    const hexToTokenBalance = (hexBalance: string, decimals: number = 18): string => {
        try {
            // 如果返回的是0x，表示余额为0
            if (!hexBalance || hexBalance === "0x" || hexBalance === "0x0") {
                return "0.0000";
            }

            const balance = parseInt(hexBalance, 16);
            const tokenBalance = balance / Math.pow(10, decimals);

            // 根据余额大小动态调整显示精度
            if (tokenBalance === 0) {
                return "0.0000";
            } else if (tokenBalance < 0.001) {
                return tokenBalance.toFixed(8);
            } else if (tokenBalance < 1) {
                return tokenBalance.toFixed(6);
            } else if (tokenBalance < 1000) {
                return tokenBalance.toFixed(4);
            } else {
                // 大数值时显示整数部分和较少小数位
                return tokenBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        } catch (error) {
            console.error("Error converting hex to token balance:", error);
            return "0.0000";
        }
    };

    // 获取网络名称
    const getNetworkName = (chainId: string): string => {
        const chainIdNum = parseInt(chainId, 16);
        switch (chainIdNum) {
            case 1: return "Ethereum Mainnet";
            case 5: return "Goerli Testnet";
            case 11155111: return "Sepolia Testnet";
            case 137: return "Polygon Mainnet";
            case 56: return "BSC Mainnet";
            case 10: return "Optimism";
            case 42161: return "Arbitrum One";
            case 7560: return "Cyber Mainnet";
            case 111557560: return "Cyber Testnet";
            case 8453: return "Base Mainnet";
            default: return `Chain ${chainIdNum}`;
        }
    };

    // CYBER代币合约地址
    const CYBER_CONTRACT_ADDRESS = "0x14778860E937f509e651192a90589dE711Fb88a9";

    // 监听账户响应和账户变化事件
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
                const { messageId, result, error } = event.data;

                // 处理连接状态检查
                if (messageId && messageId.startsWith("debug-panel-check-connection-")) {
                    if (result && result.length > 0) {
                        setIsConnected(true);
                        setConnectionStatus("Connected");
                    } else {
                        setIsConnected(false);
                        setConnectionStatus("Not connected");
                    }
                }

                if (messageId && messageId.startsWith("debug-panel-get-address-")) {
                    if (result && result.length > 0) {
                        const address = result[0];
                        setCurrentAddress(address);
                        setIsConnected(true);
                        setConnectionStatus("Connected");
                        // 地址获取成功后，获取余额
                        fetchEthBalance(address);
                        fetchTokenBalance(address, CYBER_CONTRACT_ADDRESS, "CYBER");
                    } else {
                        setCurrentAddress("No account found");
                        setIsConnected(false);
                        setConnectionStatus("No account found");
                    }
                }

                if (messageId && messageId.startsWith("debug-panel-get-chainid-")) {
                    if (result) {
                        const chainId = result;
                        const chainName = getNetworkName(chainId);
                        setNetworkInfo({
                            chainId: parseInt(chainId, 16).toString(),
                            chainName
                        });
                    }
                }

                if (messageId && messageId.startsWith("debug-panel-get-eth-balance-")) {
                    if (result) {
                        const ethBalance = hexToEth(result);
                        setTokenBalances(prev => prev.map(token =>
                            token.symbol === "ETH"
                                ? { ...token, balance: ethBalance }
                                : token
                        ));
                    } else if (error) {
                        setTokenBalances(prev => prev.map(token =>
                            token.symbol === "ETH"
                                ? { ...token, balance: "Error" }
                                : token
                        ));
                    }
                }

                // 处理CYBER代币余额响应
                if (messageId && messageId.startsWith("debug-panel-get-cyber-balance-")) {
                    if (result) {
                        const cyberBalance = hexToTokenBalance(result, 18); // CYBER有18位小数
                        setTokenBalances(prev => prev.map(token =>
                            token.symbol === "CYBER"
                                ? { ...token, balance: cyberBalance }
                                : token
                        ));
                    } else if (error) {
                        console.error("CYBER balance error:", error);
                        setTokenBalances(prev => prev.map(token =>
                            token.symbol === "CYBER"
                                ? { ...token, balance: "Error" }
                                : token
                        ));
                    }
                }
            }

            // 监听账户变化事件
            if (event.data.type === "WALLET_EVENT" && event.data.event === "accountsChanged") {
                const accounts = event.data.data;
                if (accounts && accounts.length > 0) {
                    const address = accounts[0];
                    setCurrentAddress(address);
                    setIsConnected(true);
                    setConnectionStatus("Connected");
                    fetchEthBalance(address);
                    fetchTokenBalance(address, CYBER_CONTRACT_ADDRESS, "CYBER");
                } else {
                    setCurrentAddress("No account found");
                    setIsConnected(false);
                    setConnectionStatus("No account found");
                }
            }

            // 监听网络变化事件
            if (event.data.type === "WALLET_EVENT" && event.data.event === "chainChanged") {
                const chainId = event.data.data;
                if (chainId) {
                    const chainName = getNetworkName(chainId);
                    setNetworkInfo({
                        chainId: parseInt(chainId, 16).toString(),
                        chainName
                    });
                    // 网络变化时重新获取余额
                    if (currentAddress && currentAddress !== "Loading..." && currentAddress !== "No account found") {
                        fetchEthBalance(currentAddress);
                        fetchTokenBalance(currentAddress, CYBER_CONTRACT_ADDRESS, "CYBER");
                    }
                }
            }

            // 监听连接状态变化事件
            if (event.data.type === "WALLET_EVENT" && event.data.event === "connect") {
                setIsConnected(true);
                setConnectionStatus("Connected");
                checkConnectionStatus();
            }

            if (event.data.type === "WALLET_EVENT" && event.data.event === "disconnect") {
                setIsConnected(false);
                setConnectionStatus("Disconnected");
                setCurrentAddress("No account found");
                setTokenBalances(prev => prev.map(token => ({ ...token, balance: "N/A" })));
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [currentAddress, fetchEthBalance, fetchTokenBalance, checkConnectionStatus]);

    // 组件挂载时获取所有数据
    useEffect(() => {
        checkConnectionStatus();
        fetchNetworkInfo();
    }, [checkConnectionStatus, fetchNetworkInfo]);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (!currentAddress.toLocaleLowerCase().startsWith('0x')) {
            interval = setInterval(() => {
                fetchCurrentAddress();
            }, 1000);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        }
    }, [currentAddress, fetchCurrentAddress]);

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
                const { method, params, messageId } = event.data;
                if (method && params && messageId) {
                    const idStr = String(messageId);
                    // 过滤掉调试面板内部的方法调用
                    if (!idStr.startsWith("debug-panel-")) {
                        addCall(method, params, idStr);
                    }
                }
            }

            if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
                const { messageId, result, error } = event.data;
                if (messageId) {
                    const idStr = String(messageId);
                    // 只更新非内部调用的响应
                    if (!idStr.startsWith("debug-panel-")) {
                        updateCall(idStr, result, error);
                    }
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
            <div className="wallet-debug-header" >
                <div className="flex-row">
                    <span title={currentAddress} style={{
                        width: '100%',
                        fontSize: 14
                    }}>
                        Wallet Terminal
                    </span>

                    {/**
                     * 
                     <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        border: '1px solid #444',
                        borderRadius: 4,
                        padding: 2,
                        width: 'fit-content',
                        background: isConnected
                            ? 'rgba(175, 235, 170, 0.1)'
                            : 'rgba(235, 175, 175, 0.1)'
                    }}>
                        <div style={{
                            background: isConnected ? 'green' : 'red',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                        }}></div>
                        <span style={{
                            width: '100%',
                            fontSize: 10,
                            fontWeight: 700,
                            color: isConnected ? 'green' : 'red',
                            lineHeight: 1
                        }}>
                            {connectionStatus}
                        </span>
                    </div>
                     */}
                </div>

                <div className="wallet-status">
                    <span className="title">
                        Network
                    </span>

                    <span style={{
                        lineHeight: 1
                    }}>
                        Chain ID: <span style={{ color: 'yellow' }}>{networkInfo.chainId}</span>
                    </span>

                    <span style={{
                        lineHeight: 1
                    }} >
                        Name: {networkInfo.chainName}
                    </span>
                </div>
                <div className="wallet-status">
                    <span className="title" style={{
                        marginTop: 4
                    }}>
                        Current Address
                    </span>

                    <span title={currentAddress} style={{
                        width: '100%',
                        textWrap: 'wrap',
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1
                    }}>
                        {currentAddress}
                    </span>
                </div>

                {/* <div className="divider" /> */}
                <div className="wallet-status">
                    <span className="title" >
                        Token Balance
                    </span>
                    {tokenBalances.map((token) => (
                        <div key={token.symbol} className="token-item">
                            <div className="token">
                                <img src={token.icon} />
                                <span>{token.symbol}</span>
                            </div>
                            <span>{token.balance}</span>
                        </div>
                    ))}
                </div>
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
                <span className="title" >
                    Function call
                </span>
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