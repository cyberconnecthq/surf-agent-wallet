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

        // Preserve the original inline styles so we can restore them later
        const originalMarginRight = body.style.marginRight || "";

        // 1. Inject a <style> tag that shifts the page content to the left
        const styleElementId = "surf-wallet-debug-panel-style";
        let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = styleElementId;
            styleElement.textContent = `
                html {
                    transition: margin-right 0.2s ease-in-out;
                    margin-right: 220px !important;
                    box-sizing: border-box;
                }
            `;
            document.head.appendChild(styleElement);
        }

        // 2. Create (or reuse) the panel container
        const container = document.createElement("div");
        container.id = "surf-wallet-debug-panel";
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.right = "0";
        container.style.width = "220px";
        container.style.height = "100vh";
        container.style.zIndex = "10000";
        container.style.pointerEvents = "auto";
        container.style.fontFamily = "Open Runde, Monaco, Menlo, Ubuntu Mono, monospace";
        container.style.background = "transparent";

        body.appendChild(container);

        const root = createRoot(container);
        root.render(<WalletDebugPanel />);

        (window as any).__debugPanelCleanup = () => {
            // Restore original margin
            body.style.marginRight = originalMarginRight;

            // Remove injected style tag
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }

            // Remove the React root & container
            root.unmount();
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

