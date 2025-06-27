import React from "react";
import { DebugCall } from "../types";
import { StatusTag } from "./StatusTag";

interface DebugCallItemProps {
    call: DebugCall;
}

export const DebugCallItem: React.FC<DebugCallItemProps> = ({ call }) => {
    const timeStr = new Date(call.timestamp).toLocaleTimeString();
    const durationStr = call.duration ? `${call.duration}ms` : "";

    return (
        <div className="surf:flex surf:flex-col surf:gap-1 surf:w-full">
            <div className="surf:flex surf:justify-between surf:items-center surf:w-full">
                <span className="surf:text-[12px] surf:font-normal surf:leading-4 surf:text-[#F5F4F4]">
                    {call.method}
                </span>
                <StatusTag status={call.status} />
            </div>

            {/* Display parameters (in) */}
            {call.params.length > 0 && (
                <div className="surf:w-full surf:px-2 surf:py-1 surf:rounded-lg surf:bg-[rgba(255,255,255,0.04)]">
                    <span className="surf:text-[8px] surf:font-medium surf:leading-1.5 surf:text-[#7A7A7A] surf:break-words surf:whitespace-pre-wrap">
                        → {JSON.stringify(call.params)}
                    </span>
                </div>
            )}

            {/* Display result (out) */}
            {call.result !== undefined && (
                <div className="surf:w-full surf:px-2 surf:py-1 surf:rounded-lg surf:bg-[rgba(255,255,255,0.04)]">
                    <span className="surf:text-[8px] surf:font-medium surf:leading-1.5 surf:text-[#7A7A7A] surf:break-words surf:whitespace-pre-wrap">
                        ✓ {JSON.stringify(call.result)}
                    </span>
                </div>
            )}

            {/* Display error */}
            {call.error && (
                <div className="surf:w-full surf:px-2 surf:py-1 surf:rounded-lg surf:bg-[rgba(225,29,72,0.1)]">
                    <span className="surf:text-[8px] surf:font-medium surf:leading-1.5 surf:text-[#E11D48] surf:break-words surf:whitespace-pre-wrap">
                        ✗ {call.error}
                    </span>
                </div>
            )}

            <span className="surf:text-[10px] surf:font-normal surf:leading-4 surf:text-[#7A7A7A] surf:text-right">
                {timeStr} {durationStr}
            </span>
        </div>
    );
}; 