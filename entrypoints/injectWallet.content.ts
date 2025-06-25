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

    /**
     * MetaMask and most wallet providers expose isConnected() as a FUNCTION rather than a plain boolean
     * value.  Certain provider-detection utilities (e.g. @metamask/detect-provider which many dApps use
     * internally, including Reown) will invoke `provider.isConnected()` to decide whether the injected
     * provider is usable.  In our previous implementation `isConnected` was a boolean field which caused
     * a runtime TypeError (isConnected is not a function) and therefore the wallet was treated as
     * undetected.  We now align with the MetaMask API by exposing `isConnected()` as a method while
     * keeping its state in a private flag.
     */
    private _connected: boolean = true;

    // The canonical MetaMask style function
    public isConnected(): boolean {
      return this._connected;
    }

    // Backwards-compat: allow reading the property directly (rarely used but harmless) so that code
    // doing `if (provider.isConnected)` continues to work.
    get isConnectedFlag(): boolean {
      return this._connected;
    }

    constructor() {
      super();

      this.chainId = "0x1";
      this.networkVersion = "1";

      this._connected = true;
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

  // For multi-provider environments (window.ethereum.providers) we expose our provider in an array so
  // that libraries which iterate over providers (e.g. detectEthereumProvider with multiple providers)
  // can still recognise the "MetaMask" flag.
  try {
    const existingProviders = (window as any).ethereum?.providers ?? [];
    const providersArray = Array.isArray(existingProviders)
      ? existingProviders.filter((p: any) => p && p.isMetaMask !== true) // remove old clones
      : [];

    providersArray.unshift(ethereum);
    Object.defineProperty(ethereum, "providers", {
      value: providersArray,
      writable: false,
      configurable: true,
    });
  } catch (e) {
    console.warn("Could not expose providers array", e);
  }

  try {
    Object.defineProperty(window, "ethereum", {
      value: ethereum,
      writable: false,
      configurable: false,
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

  console.log("🚀 My Wallet Extension injected and flipped successfully!");

  /* ------------------------------------------------------------------
   * EIP-6963 – Multi Injected Provider Discovery
   * ------------------------------------------------------------------
   * Many modern dApps (including Reown/AppKit) no longer look at
   * window.ethereum directly.  Instead they rely on the standardised
   * event based discovery flow defined in EIP-6963:
   *   1. The dApp dispatches an `eip6963:requestProvider` event.
   *   2. Wallets respond by dispatching `eip6963:announceProvider`
   *      with their descriptor and the provider instance.
   * Here we proactively announce ourselves once we are ready and also
   * listen for future requests so the dApp can discover the provider
   * at any point in its life-cycle.
   * ------------------------------------------------------------------ */

  type Eip6963ProviderInfo = {
    walletId: string; // stable reverse-dns identifier
    uuid: string; // session-unique identifier
    name: string; // human friendly name shown in UIs
    icon: string; // data-URI or URL for 96×96 icon
  };

  // --- prepare MetaMask & Rabby identities ---------------------------------
  const providerInfos: Eip6963ProviderInfo[] = [
    {
      walletId: "io.metamask",
      uuid:
        (typeof crypto !== "undefined" && (crypto as any)?.randomUUID?.()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: "MetaMask",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23F6851B'/%3E%3C/svg%3E",
    },
    {
      walletId: "xyz.rabby", // Rabby 官方使用 xyz.rabby
      uuid:
        (typeof crypto !== "undefined" && (crypto as any)?.randomUUID?.()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: "Surf Wallet",
      icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHZpZXdCb3g9IjAgMCAyNSAyNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE1LjY2MzUgMTUuODA1NEMxNi4xMDEgMTUuODA1NSAxNi41MTUxIDE2LjAwNDcgMTYuNzg4NSAxNi4zNDY0TDE5LjA1OTkgMTkuMTg2MkMxOS4wOTA4IDE5LjIyNDggMTkuMTIzMyAxOS4yNjEgMTkuMTU2NiAxOS4yOTQ2QzE5LjUyNzEgMTkuNjY4MyAyMC4wMDAxIDIwLjA4IDIwLjAwMDQgMjAuNjA2MUMyMC4wMDA0IDIxLjE0NTggMTkuNTYyNSAyMS41ODM3IDE5LjAyMjggMjEuNTgzN0gxOC43Mzk2QzE4LjM1NjkgMjEuNTgzNiAxNy45OTQ1IDIxLjQwOTggMTcuNzU1MiAyMS4xMTFMMTYuNDk1NSAxOS41MzY4QzE1Ljc0MTcgMTguNTk0NSAxNC4yMjIzIDE5LjEyNzEgMTQuMjIyIDIwLjMzMzdWMjEuNDc2M0MxNC4yMjIgMjEuNTM2OSAxNC4xNzAzIDIxLjU4MzYgMTQuMTA5NyAyMS41ODM3SDEyLjExMTdDMTEuNDIzMyAyMS41ODM1IDEwLjc3MjIgMjEuMjcwNiAxMC4zNDIyIDIwLjczMzFMOS4zODUxMyAxOS41MzY4QzguNjMxMyAxOC41OTQ1IDcuMTEwOTUgMTkuMTI3MSA3LjExMDcyIDIwLjMzMzdWMjEuNDc2M0M3LjExMDcgMjEuNTM2OSA3LjA1OSAyMS41ODM2IDYuOTk4NDEgMjEuNTgzN0g1LjAwMDM3QzQuMzEyMDIgMjEuNTgzNSAzLjY2MDg5IDIxLjI3MDYgMy4yMzA4MyAyMC43MzMxTDIuMjczOCAxOS41MzY4QzEuODk0MTQgMTkuMDYyMiAxLjMzMzM3IDE4LjU3NjIgMS4zMzMzNyAxNy45Njg0VjE1LjkxNzdDMS4zMzM0NCAxNS44NTcxIDEuMzgwMiAxNS44MDU0IDEuNDQwOCAxNS44MDU0QzEuODc4NDggMTUuODA1NCAyLjI5MjM3IDE2LjAwNDYgMi41NjU4IDE2LjM0NjRMNC44MzcyOCAxOS4xODYyQzUuNTkxMTkgMjAuMTI4MyA3LjExMDYzIDE5LjU5NSA3LjExMDcyIDE4LjM4ODRWMTcuMjQ2OEM3LjExMDcyIDE2LjQ1MSA3Ljc1NjM1IDE1LjgwNTQgOC41NTIxMiAxNS44MDU0QzguOTg5OCAxNS44MDU0IDkuNDAzNzEgMTYuMDA0NiA5LjY3NzEyIDE2LjM0NjRMMTEuOTQ4NiAxOS4xODYyQzEyLjcwMDIgMjAuMTI1NCAxNC4yMTI3IDE5LjU5OCAxNC4yMjIgMTguMzk5MVYxNy4yNDY4QzE0LjIyMiAxNi40NTEgMTQuODY3NyAxNS44MDU0IDE1LjY2MzUgMTUuODA1NFpNMTUuNjYzNSA4LjY5NDAzQzE2LjEwMSA4LjY5NDEzIDE2LjUxNTEgOC44OTMzNCAxNi43ODg1IDkuMjM1MDVMMTkuMDU5OSAxMi4wNzQ5QzE5LjQzOTQgMTIuNTQ5IDIwLjAwMDQgMTMuMDMzMSAyMC4wMDA0IDEzLjY0MDNWMTUuNjkyMUMyMC4wMDAzIDE1Ljc1MjcgMTkuOTUzNiAxNS44MDUzIDE5Ljg5MjkgMTUuODA1NEMxOS40NTUzIDE1LjgwNTQgMTkuMDQxNCAxNS42MDYxIDE4Ljc2NzkgMTUuMjY0M0wxNi40OTU1IDEyLjQyNTVDMTUuNzQxNyAxMS40ODM0IDE0LjIyMjUgMTIuMDE1OSAxNC4yMjIgMTMuMjIyNFYxNC4zNjQ5QzE0LjIyMiAxNS4xNjA1IDEzLjU3NzIgMTUuODA1MyAxMi43ODE2IDE1LjgwNTRDMTIuMzQzOSAxNS44MDU0IDExLjkzIDE1LjYwNjEgMTEuNjU2NiAxNS4yNjQzTDkuMzg1MTMgMTIuNDI1NUM4LjYzMTM1IDExLjQ4MzIgNy4xMTExMyAxMi4wMTU5IDcuMTEwNzIgMTMuMjIyNFYxNC4zNjQ5QzcuMTEwNjQgMTUuMTYwNiA2LjQ2NTk2IDE1LjgwNTQgNS42NzAyOSAxNS44MDU0QzUuMjMyNjIgMTUuODA1MyA0LjgxODcgMTUuNjA2MSA0LjU0NTI5IDE1LjI2NDNMMi4yNzM4IDEyLjQyNTVDMS44OTQxNCAxMS45NTA5IDEuMzMzMzcgMTEuNDY0OSAxLjMzMzM3IDEwLjg1NzFWOC44MDYzNEMxLjMzMzQ0IDguNzQ1NzUgMS4zODAyIDguNjk0MDMgMS40NDA4IDguNjk0MDNDMS44Nzg0MyA4LjY5NDAzIDIuMjkyMzcgOC44OTMzNSAyLjU2NTggOS4yMzUwNUw0LjgzNzI4IDEyLjA3NDlDNS41OTExOCAxMy4wMTcyIDcuMTEwNzEgMTIuNDgzOCA3LjExMDcyIDExLjI3N1YxMC4xMzU0QzcuMTEwNzIgOS4zMzk2NiA3Ljc1NjM1IDguNjk0MDMgOC41NTIxMiA4LjY5NDAzQzguOTg5NzUgOC42OTQwNyA5LjQwMzcxIDguODkzMzUgOS42NzcxMiA5LjIzNTA1TDExLjk0ODYgMTIuMDc0OUMxMi43MDAxIDEzLjAxNDEgMTQuMjEyMyAxMi40ODczIDE0LjIyMiAxMS4yODg4VjEwLjEzNTRDMTQuMjIyIDkuMzM5NjYgMTQuODY3NyA4LjY5NDAzIDE1LjY2MzUgOC42OTQwM1pNMi41OTQxMiAyLjkxNjY5QzIuOTc2ODkgMi45MTY3OCAzLjMzOTM1IDMuMDkwNDUgMy41Nzg0OSAzLjM4OTM0TDQuODM3MjggNC45NjM1NkM1LjU5MTE3IDUuOTA1OTMgNy4xMTA3MSA1LjM3MjUyIDcuMTEwNzIgNC4xNjU3MVYzLjAyNDExQzcuMTEwNzIgMi45NjM1IDcuMTYzNDEgMi45MTY3OCA3LjIyNCAyLjkxNjY5SDkuMjIyMDVDOS45MTAzNiAyLjkxNjc4IDEwLjU2MTYgMy4yMjk4IDEwLjk5MTYgMy43NjcyN0wxMS45NDg2IDQuOTYzNTZDMTIuNzAwMSA1LjkwMjk2IDE0LjIxMjUgNS4zNzYyIDE0LjIyMiA0LjE3NzQzVjMuMDI0MTFDMTQuMjIyIDIuOTYzNSAxNC4yNzQ3IDIuOTE2NzggMTQuMzM1MyAyLjkxNjY5SDE2LjMzMzRDMTcuMDIxNyAyLjkxNjc4IDE3LjY3MjkgMy4yMjk4IDE4LjEwMjkgMy43NjcyN0wxOS4wNTk5IDQuOTYzNTZDMTkuNDM5NCA1LjQzNzg3IDIwLjAwMDIgNS45MjI1NiAyMC4wMDA0IDYuNTI5OTdWOC41ODA3NUMyMC4wMDAzIDguNjQxMzUgMTkuOTUzNiA4LjY5NDAyIDE5Ljg5MjkgOC42OTQwM0MxOS40NTU0IDguNjk0MDMgMTkuMDQxNCA4LjQ5NTUzIDE4Ljc2NzkgOC4xNTM5OUwxNi40OTU1IDUuMzE0MTVDMTUuNzQxNSA0LjM3MjEgMTQuMjIyIDQuOTA1MjkgMTQuMjIyIDYuMTEyVjcuMjUzNkMxNC4yMjIgOC4wNDkyNyAxMy41NzczIDguNjkzOTUgMTIuNzgxNiA4LjY5NDAzQzEyLjM0NCA4LjY5NDAzIDExLjkzIDguNDk1NiAxMS42NTY2IDguMTUzOTlMOS4zODUxMyA1LjMxNDE1QzguNjMxMjUgNC4zNzE3OCA3LjExMDcyIDQuOTA1MTkgNy4xMTA3MiA2LjExMlY3LjI1MzZDNy4xMTA3MiA4LjA0OTMyIDYuNDY2MDEgOC42OTQwMyA1LjY3MDI5IDguNjk0MDNDNS4yMzI3IDguNjk0MDEgNC44MTg3IDguNDk1NjUgNC41NDUyOSA4LjE1Mzk5TDIuMjczOCA1LjMxNDE1QzIuMjQyNzMgNS4yNzUzMSAyLjIxMDY0IDUuMjM4NTcgMi4xNzcxMiA1LjIwNDc3QzEuODA2NjMgNC44MzEyMiAxLjMzMzM3IDQuNDE5MzYgMS4zMzMzNyAzLjg5MzI1QzEuMzMzNDcgMy4zNTM5NSAxLjc3MDY0IDIuOTE2NzggMi4zMDk5NCAyLjkxNjY5SDIuNTk0MTJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K",
    },
  ];

  // Prepare Rabby identity via Proxy to avoid breaking EventTarget internals
  const rabbyProvider = new Proxy(ethereum, {
    get(target, prop, receiver) {
      if (prop === "isMetaMask") return false;
      if (prop === "isRabby") return true;
      if (prop === "_rabby") return {};
      const value = Reflect.get(target, prop, receiver);
      // Ensure EventTarget methods have correct this binding
      if (typeof value === "function") {
        return value.bind(target);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      if (prop === "isMetaMask" || prop === "isRabby" || prop === "_rabby")
        return true;
      return Reflect.set(target, prop, value, receiver);
    },
    has(target, prop) {
      if (prop === "isRabby") return true;
      return Reflect.has(target, prop);
    },
  });

  // expose providers array (MM first, Rabby second)
  try {
    Object.defineProperty(ethereum, "providers", {
      value: [ethereum, rabbyProvider],
      writable: false,
      configurable: true,
    });
  } catch {}

  function announceAllProviders() {
    providerInfos.forEach((info) => {
      const providerRef =
        info.walletId === "io.metamask" ? ethereum : rabbyProvider;
      try {
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info,
              provider: providerRef,
            },
          })
        );
        console.log("📣 Announced", info.walletId);
      } catch (e) {
        console.warn("Failed to announce", info.walletId, e);
      }
    });
  }

  // immediately announce & respond to future requests
  announceAllProviders();
  window.addEventListener("eip6963:requestProvider", announceAllProviders);
}
