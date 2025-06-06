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
    const walletService = WalletService.getInstance();

    console.log("🔧 Initializing wallet service...");

    // 首先尝试自动加载现有钱包
    const autoLoaded = await walletService.loadWalletAuto();
    console.log("🔧 Auto load result:", autoLoaded);

    if (autoLoaded) {
      console.log("✅ Existing wallet loaded successfully");
      const state = walletService.getWalletState();
      console.log("🔧 Loaded wallet state:", {
        isUnlocked: state.isUnlocked,
        accountsLength: state.accounts.length,
        accounts: state.accounts.map((acc) => acc.address),
      });
      return;
    }

    // 如果没有现有钱包，检查是否需要创建新钱包
    const hasWallet = await walletService.hasWallet();
    console.log("🔧 Has wallet:", hasWallet);

    if (!hasWallet) {
      console.log("🔧 No wallet found, creating new wallet...");
      const result = await walletService.createWalletAuto();
      console.log("✅ Wallet created successfully!", {
        address: result.account.address,
        mnemonic: result.mnemonic.substring(0, 20) + "...", // 只显示部分助记词用于调试
      });
    } else {
      console.log("✅ Wallet exists but needs to be unlocked");
    }

    // 验证最终状态
    const finalState = walletService.getWalletState();
    console.log("🔧 Final wallet state:", {
      isUnlocked: finalState.isUnlocked,
      accountsLength: finalState.accounts.length,
      accounts: finalState.accounts.map((acc) => acc.address),
    });
  } catch (error) {
    console.error("❌ Failed to initialize wallet service:", error);
  }
}

async function setupMessageHandlers() {
  const { WalletService } = await import("./services/walletService");
  const walletService = WalletService.getInstance();

  // GET_ACCOUNTS
  onBackgroundMessage("GET_ACCOUNTS", async () => {
    const state = walletService.getWalletState();
    if (!state.accounts || state.accounts.length === 0) {
      return [];
    }
    return [state.accounts[state.currentAccountIndex].address];
  });

  // GET_CHAIN_ID
  onBackgroundMessage("GET_CHAIN_ID", async () => {
    const state = walletService.getWalletState();
    return state.currentNetwork.chainId;
  });

  // GET_BALANCE
  onBackgroundMessage("GET_BALANCE", async ({ data }) => {
    try {
      const balance = await walletService.getBalance(data.address);
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
      console.log("🔧 Background: SEND_TRANSACTION");

      // 检查钱包状态
      const currentAccount = walletService.getCurrentAccount();
      if (!currentAccount) {
        // 尝试重新加载钱包
        const autoLoaded = await walletService.loadWalletAuto();
        if (!autoLoaded) {
          throw new Error("No account available for transaction");
        }
      }

      const { to, value, data, gas, gasPrice } = transactionParam;

      // 将 value 从 wei 转换为 ETH
      const valueInEth = value
        ? (parseInt(value, 16) / Math.pow(10, 18)).toString()
        : "0";

      try {
        const txHash = await walletService.sendTransaction(to, valueInEth);
        return txHash;
      } catch (error) {
        throw new Error(`Transaction failed: ${(error as Error).message}`);
      }
    }
  );

  // SIGN_MESSAGE
  onBackgroundMessage("SIGN_MESSAGE", async ({ data }) => {
    let currentAccount = walletService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await walletService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = walletService.getCurrentAccount();
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
    return await walletService.signMessage(data.message);
  });

  // PERSONAL_SIGN
  onBackgroundMessage("PERSONAL_SIGN", async ({ data }) => {
    let currentAccount = walletService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await walletService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = walletService.getCurrentAccount();
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
    return await walletService.personalSign(data.message);
  });

  // SIGN_TYPED_DATA
  onBackgroundMessage("SIGN_TYPED_DATA", async ({ data }) => {
    let currentAccount = walletService.getCurrentAccount();

    if (!currentAccount) {
      // 尝试重新加载钱包
      const autoLoaded = await walletService.loadWalletAuto();
      if (!autoLoaded) {
        throw new Error("No account available for signing");
      }
      currentAccount = walletService.getCurrentAccount();
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
    return await walletService.signTypedData(typedData);
  });

  // SWITCH_CHAIN
  onBackgroundMessage("SWITCH_CHAIN", async ({ data }) => {
    try {
      await walletService.switchNetwork(data.chainId);
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
    const state = walletService.getWalletState();
    return state;
  });

  onBackgroundMessage("HAS_WALLET", async () => {
    return await walletService.hasWallet();
  });

  onBackgroundMessage("GET_CURRENT_ACCOUNT", async () => {
    const currentAccount = walletService.getCurrentAccount();
    return currentAccount;
  });

  onBackgroundMessage("REFRESH_BALANCE", async ({ data }) => {
    try {
      const balance = await walletService.getBalance(data.address);
      return balance;
    } catch (error) {
      console.error("Failed to refresh balance:", error);
      return "0";
    }
  });

  onBackgroundMessage("SEND_TRANSACTION_FROM_POPUP", async ({ data }) => {
    try {
      const txHash = await walletService.sendTransaction(data.to, data.amount);
      return txHash;
    } catch (error) {
      throw new Error(`Transaction failed: ${(error as Error).message}`);
    }
  });

  console.log("🔧 Background message handlers setup complete");
}
