/** @format */

import { createRoot } from "react-dom/client";
import "../styles/global.css";
import { WalletDebugPanel } from "./terminal/components/WalletDebugPanel";

export default defineContentScript({
    matches: ["<all_urls>"],
    world: "MAIN",
    runAt: "document_end",
    main() {
        createDebugPanel();
    },
});

function createDebugPanel() {
    if (document.getElementById("surf-wallet-debug-panel")) {
        return;
    }

    const insertPanel = () => {
        const body = document.body;
        const originalBodyDisplay = body.style.display || '';
        const originalBodyFlexDirection = body.style.flexDirection || '';

        const mainContent = document.createElement("div");
        mainContent.id = "surf-wallet-main-content";
        mainContent.style.flex = "1";
        mainContent.style.minWidth = "0";
        mainContent.style.overflow = "auto";

        const existingChildren = Array.from(body.children);
        existingChildren.forEach(child => {
            mainContent.appendChild(child);
        });

        const container = document.createElement("div");
        container.id = "surf-wallet-debug-panel";
        container.style.pointerEvents = "auto";
        container.style.fontFamily = "Open Runde, Monaco, Menlo, Ubuntu Mono, monospace";

        body.style.display = "flex";
        body.style.flexDirection = "row";
        body.style.minHeight = "100vh";
        body.style.margin = "0";
        body.style.padding = "0";

        body.appendChild(mainContent);
        body.appendChild(container);

        const root = createRoot(container);
        root.render(<WalletDebugPanel />);

        (window as any).__debugPanelCleanup = () => {
            body.style.display = originalBodyDisplay;
            body.style.flexDirection = originalBodyFlexDirection;

            const mainContentChildren = Array.from(mainContent.children);
            mainContentChildren.forEach(child => {
                body.appendChild(child);
            });

            if (mainContent.parentNode) {
                mainContent.parentNode.removeChild(mainContent);
            }
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertPanel);
    } else {
        insertPanel();
    }
}

