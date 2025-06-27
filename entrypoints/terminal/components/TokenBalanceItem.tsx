import React from "react";
import { TokenBalance } from "../types";

interface TokenBalanceItemProps {
    token: TokenBalance;
}

export const TokenBalanceItem: React.FC<TokenBalanceItemProps> = ({ token }) => {
    // Only render if token has a positive balance
    if (Number(token.balance) <= 0) {
        return null;
    }

    return (
        <div className="surf:flex surf:justify-between surf:items-center surf:w-full">
            <div className="surf:flex surf:items-center surf:gap-2">
                <img
                    src={token.icon}
                    alt={token.symbol}
                    className="surf:w-4 surf:h-4 surf:rounded-full"
                    style={{
                        boxShadow: '0px 1.6px 3.2px 0px rgba(0, 0, 0, 0.08), 0px 0.4px 0.4px 0px rgba(0, 0, 0, 0.02), 0px 1.2px 2.4px 0px rgba(0, 0, 0, 0.06)'
                    }}
                />
                <span className="surf:text-[12px] surf:font-normal surf:leading-[14px] surf:text-[#F5F4F4]">
                    {token.symbol}
                </span>
            </div>
            <div className="surf:flex surf:flex-col surf:items-end surf:gap-1 surf:w-[61px]">
                <span className="surf:text-[12px] surf:font-medium surf:leading-[14px] surf:text-[#F5F4F4] surf:text-right">
                    {(parseFloat(token.balance)).toFixed(2)}
                </span>
            </div>
        </div>
    );
}; 