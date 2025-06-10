/** @format */

import { Buffer } from "buffer";
import { onBackgroundMessage } from "../utils/messaging";

// Ensure Buffer is available globally in background script
if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
  globalThis.process =
    globalThis.process ||
    ({
      env: {},
      version: "",
      versions: {},
      nextTick: (fn: any) => setTimeout(fn, 0),
      browser: true,
    } as any);
}

export default defineBackground(() => {
  console.log("🔧 Background script loaded");

  // 立即初始化钱包服务
  initializeWalletService();

  // TODO: enable this
  // pollingTokens();

  // 扩展安装时自动生成钱包（备用）
  browser.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed, ensuring wallet exists...");
    await initializeWalletService();
  });

  // 设置消息处理器
  setupMessageHandlers();
});

async function initializeWalletService() {
  try {
    const { WalletService } = await import("./services/walletService");
    const { TurnkeyService } = await import("./services/TurnkeyService");
    const walletService = WalletService.getInstance();
    const turnkeyService = TurnkeyService.getInstance();

    console.log("🔧 Initializing wallet service...");

    // 首先尝试自动加载现有钱包
    const user = await turnkeyService.whoami();
    const wallets = await turnkeyService.getWallets();
    console.log("🚀 ~ initializeWalletService ~ wallets:", wallets);
    console.log("🔧 Auto load result:", user);

    if (user) {
      console.log("✅ Existing wallet loaded successfully");
      // TODO: wallet state
      const state = walletService.getWalletState();
      console.log("🔧 Loaded wallet state:", {
        isUnlocked: state.isUnlocked,
        accountsLength: state.accounts.length,
        accounts: state.accounts.map((acc) => acc.address),
      });
      return;
    }

    // 如果没有现有钱包，检查是否需要创建新钱包
    // const hasWallet = await walletService.hasWallet();
    // const hasWallet = await turnkeyService.hasWallet();
    // console.log("🔧 Has wallet:", hasWallet);

    // if (!hasWallet) {
    //   console.log("🔧 No wallet found, creating new wallet...");
    //   const result = await walletService.createWalletAuto();
    //   console.log("✅ Wallet created successfully!", {
    //     address: result.account.address,
    //     mnemonic: result.mnemonic.substring(0, 20) + "...", // 只显示部分助记词用于调试
    //   });
    // } else {
    //   console.log("✅ Wallet exists but needs to be unlocked");
    // }

    // 验证最终状态
    // const finalState = walletService.getWalletState();
    // console.log("🔧 Final wallet state:", {
    //   isUnlocked: finalState.isUnlocked,
    //   accountsLength: finalState.accounts.length,
    //   accounts: finalState.accounts.map((acc) => acc.address),
    // });
  } catch (error) {
    console.error("❌ Failed to initialize wallet service:", error);
  }
}

async function setupMessageHandlers() {
  const { WalletService } = await import("./services/walletService");
  const { TurnkeyService } = await import("./services/TurnkeyService");

  const walletService = WalletService.getInstance();
  const turnkeyService = TurnkeyService.getInstance();

  // GET_ACCOUNTS
  onBackgroundMessage("GET_ACCOUNTS", async () => {
    const state = await turnkeyService.getWallets();
    if (!state?.evm || !state?.sol) {
      return [];
    }
    return [state.evm.address];
  });

  // GET_CHAIN_ID
  onBackgroundMessage("GET_CHAIN_ID", async () => {
    const state = turnkeyService.getWalletState();
    console.log(
      "🚀 ~ onBackgroundMessage ~ state.currentNetwork.chainId:",
      state.currentNetwork.chainId
    );
    return state.currentNetwork.chainId;
  });

  // GET_BALANCE
  onBackgroundMessage("GET_BALANCE", async ({ data }) => {
    try {
      const balance = await turnkeyService.getBalance(data.address);
      // 转换为 wei (假设 balance 是以 ETH 为单位)
      const balanceInWei = (parseFloat(balance) * Math.pow(10, 18)).toString();
      return `0x${parseInt(balanceInWei).toString(16)}`;
    } catch (error) {
      console.error("Failed to get balance:", error);
      return "0x0";
    }
  });

  // SEND_TRANSACTION
  onBackgroundMessage(
    "SEND_TRANSACTION",
    async ({ data: transactionParam }) => {
      console.log("🔧 Background: SEND_TRANSACTION", transactionParam);

      // 检查钱包状态
      const currentAccount = turnkeyService.getCurrentAccount();
      if (!currentAccount) {
        // 尝试重新加载钱包
        const autoLoaded = await turnkeyService.loadWalletAuto();
        if (!autoLoaded) {
          throw new Error("No account available for transaction");
        }
      }

      const { to, value, data, gas, gasPrice } = transactionParam;

      // 将 value 从 wei 转换为 ETH，使用 BigInt 保持精度
      let valueInEth = "0";
      if (value) {
        try {
          // Convert hex value to BigInt to avoid precision loss
          const valueInWei = BigInt(value);
          const ethValue = valueInWei / BigInt(10 ** 18);
          const remainder = valueInWei % BigInt(10 ** 18);

          // Handle fractional ETH values properly
          if (remainder === 0n) {
            valueInEth = ethValue.toString();
          } else {
            // Convert to decimal string with proper precision
            valueInEth = (Number(valueInWei) / Math.pow(10, 18)).toString();
          }
        } catch (error) {
          console.error("Error converting value:", error);
          throw new Error(`Invalid transaction value: ${value}`);
        }
      }

      console.log("🔧 Transaction params:", {
        to,
        valueInEth,
        originalValue: value,
        data,
        gasPrice,
      });

      try {
        // Pass the correct parameters to sendTransaction
        const txHash = await turnkeyService.sendTransaction(
          to,
          valueInEth,
          data as `0x${string}`,
          gasPrice
        );
        return txHash;
      } catch (error) {
        console.log("🚀 ~ error:", error);
        throw new Error(`Transaction failed: ${(error as Error).message}`);
      }
    }
  );

  // SIGN_MESSAGE
  onBackgroundMessage("SIGN_MESSAGE", async ({ data }) => {
    let currentAccount = turnkeyService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await turnkeyService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = turnkeyService.getCurrentAccount();
      if (
        !currentAccount ||
        currentAccount.address.toLowerCase() !== data.address.toLowerCase()
      ) {
        throw new Error("No account available for signing");
      }
    }

    if (currentAccount.address.toLowerCase() !== data.address.toLowerCase()) {
      throw new Error(
        `Address mismatch: expected ${currentAccount.address}, got ${data.address}`
      );
    }

    // 使用真实的签名方法
    return await turnkeyService.signMessage(data.message);
  });

  // PERSONAL_SIGN
  onBackgroundMessage("PERSONAL_SIGN", async ({ data }) => {
    let currentAccount = turnkeyService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await turnkeyService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = turnkeyService.getCurrentAccount();
      if (
        !currentAccount ||
        currentAccount.address.toLowerCase() !== data.address.toLowerCase()
      ) {
        throw new Error("No account available for signing");
      }
    }

    if (currentAccount.address.toLowerCase() !== data.address.toLowerCase()) {
      throw new Error(
        `Address mismatch: expected ${currentAccount.address}, got ${data.address}`
      );
    }

    // 使用真实的个人签名方法
    return await turnkeyService.personalSign(data.message);
  });

  // SIGN_TYPED_DATA
  onBackgroundMessage("SIGN_TYPED_DATA", async ({ data }) => {
    let currentAccount = turnkeyService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await turnkeyService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = turnkeyService.getCurrentAccount();
      if (
        !currentAccount ||
        currentAccount.address.toLowerCase() !== data.address.toLowerCase()
      ) {
        throw new Error("No account available for signing");
      }
    }

    if (currentAccount.address.toLowerCase() !== data.address.toLowerCase()) {
      throw new Error(
        `Address mismatch: expected ${currentAccount.address}, got ${data.address}`
      );
    }

    // 使用真实的类型化数据签名方法
    const typedData =
      typeof data.typedData === "string"
        ? JSON.parse(data.typedData)
        : data.typedData;
    return await turnkeyService.signTypedData(typedData);
  });

  // SWITCH_CHAIN
  onBackgroundMessage("SWITCH_CHAIN", async ({ data }) => {
    console.log("🚀 ~ onBackgroundMessage ~ data:", data);
    try {
      turnkeyService.switchNetwork(data.chainId);
      return null;
    } catch (error) {
      throw new Error(`Failed to switch chain: ${(error as Error).message}`);
    }
  });

  // ADD_CHAIN
  onBackgroundMessage("ADD_CHAIN", async ({ data: chainParam }) => {
    throw new Error("Adding custom chains is not supported yet");
  });

  // Popup相关消息处理器
  onBackgroundMessage("GET_WALLET_STATE", async () => {
    const state = turnkeyService.getWalletState();
    return state;
  });

  onBackgroundMessage("HAS_WALLET", async () => {
    return await turnkeyService.hasWallet();
  });

  onBackgroundMessage("GET_CURRENT_ACCOUNT", async () => {
    const currentAccount = turnkeyService.getCurrentAccount();
    return currentAccount;
  });

  onBackgroundMessage("REFRESH_BALANCE", async ({ data }) => {
    try {
      const balance = await turnkeyService.getBalance(data.address);
      return balance;
    } catch (error) {
      console.error("Failed to refresh balance:", error);
      return "0";
    }
  });

  onBackgroundMessage("SEND_TRANSACTION_FROM_POPUP", async ({ data }) => {
    try {
      const txHash = await turnkeyService.sendTransaction(data.to, data.amount);
      return txHash;
    } catch (error) {
      throw new Error(`Transaction failed: ${(error as Error).message}`);
    }
  });

  console.log("🔧 Background message handlers setup complete");
}

// 从content script移过来的调试函数
async function debugManagedStorage() {
  try {
    // 检查 browser.storage.managed 是否存在
    if (!browser.storage || !browser.storage.managed) {
      console.error("❌ browser.storage.managed is not available");
      return;
    }

    console.log("✅ browser.storage.managed exists");

    // 尝试获取所有管理配置
    const allManaged = await browser.storage.managed.get();
    console.log("🔍 All managed storage:", allManaged);

    // 尝试获取特定的 backendToken
    const USER_ACCESS_TOKEN = await browser.storage.managed.get(
      "USER_ACCESS_TOKEN"
    );
    console.log(
      "🚀 ~ debugManagedStorage ~ USER_ACCESS_TOKEN:",
      USER_ACCESS_TOKEN
    );

    const SESSION_ID = await browser.storage.managed.get("SESSION_ID");
    console.log("🚀 ~ debugManagedStorage ~ SESSION_ID:", SESSION_ID);

    return {
      USER_ACCESS_TOKEN: USER_ACCESS_TOKEN.USER_ACCESS_TOKEN,
      SESSION_ID: SESSION_ID.SESSION_ID,
    };
  } catch (error) {
    console.error("❌ Error accessing managed storage:", error);
    console.error("❌ Error details:", (error as Error).message);
  }
}

// 从content script移过来的轮询函数，现在在background中运行
const pollingTokens = async () => {
  console.log("🔄 Starting token polling in background script...");

  let ACCESS_TOKEN = "";
  let SESSION_ID = "";

  do {
    console.log("🔍 Polling tokens...");

    const result = await debugManagedStorage();
    ACCESS_TOKEN = result?.USER_ACCESS_TOKEN;
    SESSION_ID = result?.SESSION_ID;

    if (ACCESS_TOKEN && SESSION_ID) {
      console.log("✅ Tokens found! ACCESS_TOKEN and SESSION_ID are ready");
      // 可以在这里触发其他需要认证的初始化操作
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (!ACCESS_TOKEN || !SESSION_ID);

  console.log("🎉 Token polling completed successfully");
};
