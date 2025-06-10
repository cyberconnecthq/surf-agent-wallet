/** @format */

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "MAIN",
  runAt: "document_end",
  main() {
    createDebugPanel();
    setupDebugListener();
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

class WalletDebugPanel {
  private panel!: HTMLElement;
  private callsList!: HTMLElement;
  private calls: Map<string, DebugCall> = new Map();
  private maxCalls: number = 1;

  constructor() {
    this.createPanel();
    this.attachStyles();
  }

  private createPanel() {
    // 创建主容器
    this.panel = document.createElement("div");
    this.panel.id = "surf-wallet-debug-panel";
    this.panel.className = "wallet-debug-panel";

    // 创建头部
    const header = document.createElement("div");
    header.className = "wallet-debug-header";
    header.innerHTML = `
      <span>Wallet Debug</span>
    `;

    // 创建调用列表
    this.callsList = document.createElement("div");
    this.callsList.className = "wallet-debug-calls";

    // 组装面板
    this.panel.appendChild(header);
    this.panel.appendChild(this.callsList);

    // 添加到页面
    document.body.appendChild(this.panel);

    // 绑定清除按钮事件
    const clearButton = this.panel.querySelector(".wallet-debug-clear");
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        this.clearCalls();
      });
    }

    // 初始渲染
    this.renderCalls();
  }

  private attachStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .wallet-debug-panel {
        position: fixed !important;
        bottom: 10px !important;
        right: 10px !important;
        z-index: 999999 !important;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
        font-size: 10px !important;
        width: 280px !important;
        max-height: 200px !important;
        background: rgba(0, 0, 0, 0.9) !important;
        color: #ffffff !important;
        border: 1px solid #333 !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(8px) !important;
        overflow: hidden !important;
      }
      
      .wallet-debug-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 2px 10px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-bottom: 1px solid #333 !important;
        font-weight: bold !important;
        color: yellow !important;
        font-size: 10px !important;
      }
      
      .wallet-debug-clear {
        background: none !important;
        border: none !important;
        color: #ccc !important;
        cursor: pointer !important;
        font-size: 12px !important;
        padding: 2px !important;
        border-radius: 3px !important;
        transition: all 0.2s ease !important;
      }
      
      .wallet-debug-clear:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
      }
      
      .wallet-debug-calls {
        max-height: 160px !important;
        overflow-y: auto !important;
        padding: 4px !important;
      }
      
      .wallet-debug-call {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid #444 !important;
        border-radius: 4px !important;
        padding: 6px !important;
        margin-bottom: 4px !important;
        font-size: 9px !important;
      }
      
      .wallet-debug-call:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: #555 !important;
      }
      
      .wallet-debug-call-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 4px !important;
      }
      
      .wallet-debug-method {
        font-weight: bold !important;
        color: #64b5f6 !important;
        font-size: 9px !important;
      }
      
      .wallet-debug-status {
        padding: 1px 4px !important;
        border-radius: 3px !important;
        font-size: 8px !important;
        font-weight: bold !important;
        text-transform: uppercase !important;
        margin-left: 4px !important;
      }
      
      .wallet-debug-status.pending {
        background: #ff9800 !important;
        color: #000 !important;
        animation: pulse 1.5s infinite !important;
      }
      
      .wallet-debug-status.success {
        background: #4caf50 !important;
        color: #fff !important;
      }
      
      .wallet-debug-status.error {
        background: #f44336 !important;
        color: #fff !important;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .wallet-debug-time {
        color: #999 !important;
        font-size: 8px !important;
      }
      
      .wallet-debug-details {
        margin-top: 4px !important;
        font-size: 8px !important;
        line-height: 1.2 !important;
      }
      
      .wallet-debug-params,
      .wallet-debug-result,
      .wallet-debug-error {
        margin: 2px 0 !important;
        padding: 3px 5px !important;
        background: rgba(0, 0, 0, 0.3) !important;
        border-radius: 3px !important;
        word-break: break-all !important;
        font-size: 8px !important;
        max-height: 40px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      .wallet-debug-params {
        border-left: 2px solid #2196f3 !important;
      }
      
      .wallet-debug-result {
        border-left: 2px solid #4caf50 !important;
      }
      
      .wallet-debug-error {
        border-left: 2px solid #f44336 !important;
        color: #ffcdd2 !important;
      }
      
      .wallet-debug-empty {
        text-align: center !important;
        color: #666 !important;
        padding: 15px !important;
        font-style: italic !important;
        font-size: 9px !important;
      }
      
      /* 滚动条样式 */
      .wallet-debug-calls::-webkit-scrollbar {
        width: 4px !important;
      }
      
      .wallet-debug-calls::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 2px !important;
      }
      
      .wallet-debug-calls::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3) !important;
        border-radius: 2px !important;
      }
      
      .wallet-debug-calls::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
  }

  private clearCalls() {
    this.calls.clear();
    this.renderCalls();
  }

  public addCall(method: string, params: any[], messageId: string) {
    const call: DebugCall = {
      id: messageId,
      method,
      params,
      status: "pending",
      timestamp: Date.now(),
    };

    this.calls.set(messageId, call);

    // 限制最大调用数量
    if (this.calls.size > this.maxCalls) {
      const firstKey = Array.from(this.calls.keys())[0];
      if (firstKey) {
        this.calls.delete(firstKey);
      }
    }

    this.renderCalls();
  }

  public updateCall(messageId: string, result?: any, error?: string) {
    const call = this.calls.get(messageId);
    if (call) {
      call.status = error ? "error" : "success";
      call.result = result;
      call.error = error;
      call.duration = Date.now() - call.timestamp;
      this.renderCalls();
    }
  }

  private renderCalls() {
    if (this.calls.size === 0) {
      this.callsList.innerHTML =
        '<div class="wallet-debug-empty">No calls yet</div>';
      return;
    }

    const callsArray = Array.from(this.calls.values()).reverse();
    this.callsList.innerHTML = callsArray
      .map((call) => this.renderCall(call))
      .join("");
  }

  private renderCall(call: DebugCall): string {
    const timeStr = new Date(call.timestamp).toLocaleTimeString();
    const durationStr = call.duration ? `${call.duration}ms` : "";

    const paramsStr =
      call.params.length > 0
        ? `<div class="wallet-debug-params">→ ${JSON.stringify(
            call.params
          ).substring(0, 50)}...</div>`
        : "";

    const resultStr =
      call.result !== undefined
        ? `<div class="wallet-debug-result">✓ ${JSON.stringify(
            call.result
          ).substring(0, 50)}...</div>`
        : "";

    const errorStr = call.error
      ? `<div class="wallet-debug-error">✗ ${call.error.substring(
          0,
          50
        )}...</div>`
      : "";

    return `
      <div class="wallet-debug-call">
        <div class="wallet-debug-call-header">
          <span class="wallet-debug-method">${call.method}</span>
          <div>
            <span class="wallet-debug-status ${call.status}">${call.status}</span>
          </div>
        </div>
        <div class="wallet-debug-time">${timeStr} ${durationStr}</div>
        <div class="wallet-debug-details">
          ${paramsStr}
          ${resultStr}
          ${errorStr}
        </div>
      </div>
    `;
  }
}

let debugPanel: WalletDebugPanel;

function createDebugPanel() {
  // 避免重复创建
  if (document.getElementById("wallet-debug-panel")) {
    return;
  }

  debugPanel = new WalletDebugPanel();
}

function setupDebugListener() {
  //   console.log("🔍 Debug panel: Setting up message listener");

  // 监听钱包请求
  window.addEventListener("message", (event) => {
    // console.log("🔍 Debug panel: Received message", event.data);

    if (event.source !== window) {
      //   console.log("🔍 Debug panel: Message source is not window, ignoring");
      return;
    }

    if (event.data.type === "WALLET_REQUEST_TO_BACKGROUND") {
      //   console.log("🔍 Debug panel: Got wallet request", event.data);
      const { method, params, messageId } = event.data;
      if (method && params && messageId) {
        const idStr = String(messageId); // 转换为字符串
        // console.log("🔍 Debug panel: Adding call to panel", method, idStr);
        debugPanel?.addCall(method, params, idStr);
      } else {
        // console.log("🔍 Debug panel: Missing required fields", {
        //   method,
        //   params,
        //   messageId,
        // });
      }
    }

    if (event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND") {
      //   console.log("🔍 Debug panel: Got wallet response", event.data);
      const { messageId, result, error } = event.data;
      if (messageId) {
        const idStr = String(messageId); // 转换为字符串
        // console.log("🔍 Debug panel: Updating call in panel", idStr);
        debugPanel?.updateCall(idStr, result, error);
      } else {
        // console.log("🔍 Debug panel: Missing messageId", { messageId });
      }
    }
  });
}
