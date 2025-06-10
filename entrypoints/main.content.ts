/** @format */

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    injectEthereumProvider();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectEthereumProvider);
    }
    window.addEventListener("load", injectEthereumProvider);
  },
});

function injectEthereumProvider() {
  if ((window as any).ethereum?.isMyWallet) {
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
      return new Promise((resolve, reject) => {
        const messageId = Date.now() + Math.random();

        window.postMessage(
          {
            type: "WALLET_REQUEST_TO_BACKGROUND",
            method: args.method,
            params: args.params || [],
            messageId,
          },
          "*"
        );

        const handleResponse = (event: MessageEvent) => {
          if (
            event.data.type === "WALLET_RESPONSE_FROM_BACKGROUND" &&
            event.data.messageId === messageId
          ) {
            window.removeEventListener("message", handleResponse);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.result);
            }
          }
        };

        window.addEventListener("message", handleResponse);

        setTimeout(() => {
          window.removeEventListener("message", handleResponse);
          reject(new Error("Request timeout"));
        }, 30000);
      });
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
      });
    } else {
      console.log("✅ No existing provider, injected cleanly");
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

  console.log("🚀 My Wallet Extension injected and flipped successfully!");
}
