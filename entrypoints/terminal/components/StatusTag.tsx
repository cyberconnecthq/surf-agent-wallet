import React from "react";
import { DebugCall } from "../types";

interface StatusTagProps {
    status: DebugCall["status"];
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
    const statusConfig = {
        success: {
            text: "Success",
            bgColor: "surf:bg-[rgba(0,255,102,0.1)]",
            textColor: "surf:text-[#00FF66]"
        },
        pending: {
            text: "Pending",
            bgColor: "surf:bg-[rgba(222,195,120,0.1)]",
            textColor: "surf:text-[#DEC378]"
        },
        error: {
            text: "Reverted",
            bgColor: "surf:bg-[rgba(225,29,72,0.1)]",
            textColor: "surf:text-[#E11D48]"
        }
    };

    const config = statusConfig[status];

    return (
        <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ${config.bgColor}`}>
            <span className={`surf:text-[10px] surf:font-medium surf:leading-4 ${config.textColor}`}>
                {config.text}
            </span>
        </div>
    );
}; 