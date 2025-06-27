import React, { useEffect } from "react";
import { useDebugCalls } from "../hooks/useDebugCalls";
import { useMessageListener } from "../hooks/useMessageListener";
import { useWalletData } from "../hooks/useWalletData";
import { formatAddress } from "../utils";
import { DebugCallItem } from "./DebugCallItem";
import { TokenBalanceItem } from "./TokenBalanceItem";

export const WalletDebugPanel: React.FC = () => {
    const walletHook = useWalletData();
    const debugHook = useDebugCalls();

    const {
        walletState,
        checkConnectionStatus,
        fetchCurrentAddress,
        fetchNetworkInfo,
        calculatePortfolioValue
    } = walletHook;

    // Set up message listeners
    useMessageListener(walletHook, debugHook);

    // Initialize data on component mount
    useEffect(() => {
        checkConnectionStatus();
        fetchCurrentAddress();
        fetchNetworkInfo();
    }, [checkConnectionStatus, fetchCurrentAddress, fetchNetworkInfo]);

    // Calculate portfolio value when balances change
    useEffect(() => {
        calculatePortfolioValue();
    }, [walletState.tokenBalances, calculatePortfolioValue]);

    const callsArray = Array.from(debugHook.calls.values()).reverse();

    return (
        <div
            className="surf:w-[219px] surf:h-screen surf:bg-[#0E0E0E] surf:text-white surf:font-[Open_Runde] surf:flex surf:flex-col"
            style={{
                position: 'sticky',
                right: 0,
                top: 0,
                bottom: 0,
                zIndex: 10000,
                fontFamily: 'Open Runde, sans-serif'
            }}
        >
            {/* Header - Address and Network Info */}
            <div className="surf:flex surf:justify-between surf:items-center surf:gap-4 surf:px-3 surf:py-3">
                <div className="surf:flex surf:items-center surf:gap-2 surf:px-2 surf:py-1 surf:rounded-full surf:bg-[rgba(255,255,255,0.04)]">
                    <span className="surf:text-[10px] surf:font-medium surf:leading-4 surf:text-[#7A7A7A]">
                        {formatAddress(walletState.currentAddress)}
                    </span>
                </div>
                <div className="surf:flex surf:items-center surf:gap-1 surf:px-2 surf:py-1 surf:rounded-full surf:bg-[rgba(255,255,255,0.04)]">
                    <div className="surf:w-3 surf:h-3 surf:bg-white surf:rounded-sm surf:flex surf:items-center surf:justify-center">
                        <div className="surf:w-2 surf:h-2 surf:bg-[#8891AE] surf:rounded-[1px]"></div>
                    </div>
                    <span className="surf:text-[10px] surf:font-normal surf:leading-4 surf:text-[#7A7A7A]">
                        {walletState.networkInfo.chainName.split(' ')[0]}
                    </span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="surf:flex-1 surf:flex surf:flex-col surf:gap-7 surf:px-4 surf:py-4 surf:overflow-y-auto">
                {/* Portfolio Section */}
                <div className="surf:flex surf:flex-col surf:gap-3">
                    <span className="surf:text-[10px] surf:font-normal surf:leading-[12px] surf:text-[#7A7A7A]">
                        Portfolio
                    </span>
                    <span className="surf:text-[20px] surf:font-semibold surf:leading-[24px] surf:text-[#F5F4F4] surf:text-right">
                        ${walletState.portfolioValue}
                    </span>
                </div>

                {/* Token Balance Section */}
                <div className="surf:flex surf:flex-col surf:gap-3 surf:w-full">
                    <span className="surf:text-[10px] surf:font-normal surf:leading-[12px] surf:text-[#7A7A7A]">
                        Token Balance
                    </span>
                    <div className="surf:flex surf:flex-col surf:gap-2 surf:w-full">
                        {walletState.tokenBalances.map((token) => (
                            <TokenBalanceItem key={token.symbol} token={token} />
                        ))}
                    </div>
                </div>

                {/* Function Call Section */}
                <div className="surf:flex surf:flex-col surf:gap-3 surf:w-full">
                    <span className="surf:text-[10px] surf:font-normal surf:leading-[12px] surf:text-[#7A7A7A]">
                        Function Call
                    </span>
                    <div className="surf:flex surf:flex-col surf:gap-3 surf:w-full">
                        {debugHook.calls.size === 0 ? (
                            <div className="surf:text-[12px] surf:text-[#7A7A7A] surf:text-center surf:py-4">
                                No calls yet
                            </div>
                        ) : (
                            callsArray.map((call) => (
                                <DebugCallItem key={call.id} call={call} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 