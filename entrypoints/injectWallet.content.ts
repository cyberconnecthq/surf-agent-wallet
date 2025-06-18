/** @format */

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    // 先注入基础的 ethereum 对象，但标记为未就绪
    injectEthereumProvider(false);

    // 等待 ISOLATED world 准备就绪
    let isolatedReady = false;
    window.addEventListener("message", (event) => {
      if (event.data.type === "WALLET_ISOLATED_READY" && !isolatedReady) {
        isolatedReady = true;
        injectEthereumProvider(true); // 激活完整功能
      }
    });

    // 兜底：如果 500ms 内没收到就绪信号，强制激活
    setTimeout(() => {
      if (!isolatedReady) {
        console.warn(
          "⚠️ ISOLATED world not ready after 500ms, force activating"
        );
        injectEthereumProvider(true);
      }
    }, 500);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        injectEthereumProvider(true)
      );
    }
    window.addEventListener("load", () => injectEthereumProvider(true));
  },
});

function injectEthereumProvider(fullyActivate = true) {
  if (
    (window as any).ethereum?.isMyWallet &&
    (window as any).ethereum._isFullyActivated === fullyActivate
  ) {
    return;
  }

  let originalProvider: any = null;
  if ((window as any).ethereum) {
    originalProvider = (window as any).ethereum;
    console.log("🔄 Detected existing provider:", {
      isMetaMask: originalProvider.isMetaMask,
      isCoinbaseWallet: originalProvider.isCoinbaseWallet,
      isRabby: originalProvider.isRabby,
      provider: originalProvider.constructor.name,
    });
  }

  class EthereumProvider extends EventTarget {
    public isConnected: boolean = false;
    public selectedAddress: string | null = null;
    public chainId: string | null = null;
    public networkVersion: string | null = null;
    public isWalletExtension: boolean = true;
    public isMetaMask: boolean = true;
    public isRabby: boolean = false;

    public isMyWallet: boolean = true;

    public isInjected: boolean = true;
    public _metamask: object = {
      isUnlocked: async () => true,
      requestBatch: async () => [],
    };

    public _originalProvider: any = originalProvider;
    public _isFullyActivated: boolean = false;
    private _pendingRequests = new Map<string, Promise<any>>();

    constructor() {
      super();

      this.chainId = "0x1";
      this.networkVersion = "1";

      this.isConnected = true;
    }

    switchToOriginalProvider(): boolean {
      if (this._originalProvider) {
        try {
          Object.defineProperty(window, "ethereum", {
            value: this._originalProvider,
            writable: false,
            configurable: true,
          });
          console.log("🔄 Switched back to original provider");
          return true;
        } catch (error) {
          console.error("Failed to switch back to original provider:", error);
          return false;
        }
      }
      return false;
    }

    async request(args: { method: string; params?: any[] }): Promise<any> {
      // 生成请求的唯一键
      const requestKey = `${args.method}:${JSON.stringify(args.params || [])}`;

      // 检查是否有相同的请求正在进行
      if (this._pendingRequests.has(requestKey)) {
        console.log("🔄 Reusing pending request for:", requestKey);
        return this._pendingRequests.get(requestKey)!;
      }

      // 检查是否完全激活
      if (!this._isFullyActivated) {
        console.warn("⚠️ Ethereum provider not fully activated, waiting...");
        // 等待最多 2 秒
        await new Promise((resolve) => {
          const checkReady = () => {
            if (this._isFullyActivated) {
              resolve(void 0);
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
          setTimeout(() => resolve(void 0), 2000); // 2 秒兜底
        });
      }

      const requestPromise = new Promise<any>((resolve, reject) => {
        // 生成更安全的唯一 messageId
        const messageId = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}-${performance.now()}`;

        window.postMessage(
          {
            type: "WALLET_REQUEST_TO_BACKGROUND",
            method: args.method,
            params: args.params || [],
            messageId,
          },
          "*"
        );

        let isHandled = false;

        const handleResponse = (event: MessageEvent) => {
          if (
            event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND" &&
            event.data.messageId === messageId &&
            !isHandled
          ) {
            isHandled = true;
            window.removeEventListener("message", handleResponse);

            // 从 pending 请求中移除
            this._pendingRequests.delete(requestKey);

            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.result);
            }
          }
        };

        window.addEventListener("message", handleResponse);

        setTimeout(
          () => {
            if (!isHandled) {
              isHandled = true;
              window.removeEventListener("message", handleResponse);
              console.error(
                "❌ EthereumProvider.request timeout:",
                args.method,
                "messageId:",
                messageId
              );

              // 从 pending 请求中移除
              this._pendingRequests.delete(requestKey);

              reject(new Error(`Request timeout for method: ${args.method}`));
            }
          },
          args.method === "eth_accounts" ? 30000 : 30000 // 改回 5 秒
        );
      });

      // 将请求加入 pending map
      this._pendingRequests.set(requestKey, requestPromise);

      return requestPromise;
    }

    async enable(): Promise<string[]> {
      return this.request({ method: "eth_requestAccounts" });
    }

    sendAsync(
      payload: any,
      callback: (error: any, result?: any) => void
    ): void {
      this.request(payload)
        .then((result) => callback(null, { id: payload.id, result }))
        .catch((error) => callback(error));
    }

    send(methodOrPayload: string | any, callbackOrParams?: any): any {
      if (typeof methodOrPayload === "string") {
        return this.request({
          method: methodOrPayload,
          params: callbackOrParams || [],
        });
      } else {
        this.sendAsync(methodOrPayload, callbackOrParams);
      }
    }

    on(event: string, callback: (...args: any[]) => void): void {
      this.addEventListener(event, callback as EventListener);
    }

    removeListener(event: string, callback: (...args: any[]) => void): void {
      this.removeEventListener(event, callback as EventListener);
    }
  }

  const ethereum = new EthereumProvider();

  // 设置激活状态
  ethereum._isFullyActivated = fullyActivate;

  try {
    Object.defineProperty(window, "ethereum", {
      value: ethereum,
      writable: false,
      configurable: true,
    });

    if (originalProvider) {
      console.log("✅ Successfully flipped existing provider:", {
        originalWasMetaMask: originalProvider.isMetaMask,
        originalWasCoinbase: originalProvider.isCoinbaseWallet,
        originalWasRabby: originalProvider.isRabby,
        nowMyWallet: ethereum.isMyWallet,
        fullyActivated: fullyActivate,
      });
    } else {
      console.log("✅ No existing provider, injected cleanly", {
        fullyActivated: fullyActivate,
      });
    }
  } catch (error) {
    console.error("❌ Failed to override ethereum provider:", error);
    return;
  }

  try {
    (window as any).web3 = {
      currentProvider: ethereum,
      eth: {
        defaultAccount: null,
        coinbase: null,
      },
    };
  } catch (error) {
    console.warn("Could not override web3:", error);
  }

  window.addEventListener("message", (event) => {
    if (event.data.type === "WALLET_EVENT") {
      const ethProvider = (window as any).ethereum;
      if (ethProvider && ethProvider.isMyWallet) {
        ethProvider.dispatchEvent(
          new CustomEvent(event.data.event, {
            detail: event.data.data,
          })
        );

        if (event.data.event === "accountsChanged") {
          ethProvider.selectedAddress = event.data.data[0] || null;
        }
        if (event.data.event === "chainChanged") {
          ethProvider.chainId = event.data.data;
          ethProvider.networkVersion = parseInt(event.data.data, 16).toString();
        }
      }
    }
  });

  setTimeout(() => {
    if ((window as any).ethereum && !(window as any).ethereum.isMyWallet) {
      console.log("🔄 Another wallet tried to override, re-injecting...");
      Object.defineProperty(window, "ethereum", {
        value: ethereum,
        writable: false,
        configurable: true,
      });
    }
  }, 100);

  setTimeout(() => {
    window.dispatchEvent(new Event("ethereum#initialized"));

    if (ethereum._metamask) {
      (ethereum._metamask as any).isUnlocked = async () => {
        try {
          const accounts = await ethereum.request({ method: "eth_accounts" });
          return accounts && accounts.length > 0;
        } catch {
          return false;
        }
      };
    }

    console.log("🎯 RainbowKit compatibility initialized");
  }, 50);

  if (document.readyState === "complete") {
    setTimeout(() => {
      window.dispatchEvent(new Event("ethereum#initialized"));
    }, 200);
  } else {
    window.addEventListener("load", () => {
      setTimeout(() => {
        window.dispatchEvent(new Event("ethereum#initialized"));
      }, 200);
    });
  }
}
