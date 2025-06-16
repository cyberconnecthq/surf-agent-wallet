/** @format */

import { Buffer } from "buffer";
import { onBackgroundMessage } from "../utils/messaging";
import { TurnkeyService } from "./services/TurnkeyService";
import { NETWORKS } from "./types/wallet";

const turnkeyService = TurnkeyService.getInstance();

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
  console.log("🔧 Background script loaded at:", new Date().toISOString());

  // // 立即初始化钱包服务
  // initializeWalletService();

  // // TODO: enable this
  // // pollingTokens();

  // 立即设置消息处理器，确保第一时间可以响应请求
  setupMessageHandlers().catch((error) => {
    console.error(
      "❌ Critical: Background message handlers setup failed:",
      error
    );
  });

  // 扩展安装时自动生成钱包（备用）
  browser.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed, ensuring wallet exists...");
    await initializeWalletService();
  });

  // 扩展启动时也初始化（处理重新加载的情况）
  browser.runtime.onStartup.addListener(async () => {
    console.log("Extension startup, re-initializing...");
    await initializeWalletService();
  });
});

async function initializeWalletService() {
  try {
    const turnkeyService = TurnkeyService.getInstance();
    console.log("🔧 Initializing wallet service...");
    // 首先尝试自动加载现有钱包
    // const user = await turnkeyService.whoami();
    const wallets = await turnkeyService.getWallets();
    console.log("🚀 ~ initializeWalletService ~ wallets:", wallets);
    // console.log("🔧 Auto load result:", user);
    // if (user) {
    //   console.log("✅ Existing wallet loaded successfully");
    //   // TODO: wallet state
    //   console.log("🔧 Loaded wallet state:", {
    //     isUnlocked: state.isUnlocked,
    //     accountsLength: state.accounts.length,
    //     accounts: state.accounts.map((acc) => acc.address),
    //   });
    //   return;
    // }
    // 如果没有现有钱包，检查是否需要创建新钱包
    // const hasWallet = await turnkeyService.hasWallet();
    // console.log("🔧 Has wallet:", hasWallet);
    // if (!hasWallet) {
    //   console.log("🔧 No wallet found, creating new wallet...");
    //   console.log("✅ Wallet created successfully!", {
    //     address: result.account.address,
    //     mnemonic: result.mnemonic.substring(0, 20) + "...", // 只显示部分助记词用于调试
    //   });
    // } else {
    //   console.log("✅ Wallet exists but needs to be unlocked");
    // }
    // 验证最终状态
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
  console.log(
    "🚀 ~ setupMessageHandlers ~ setupMessageHandlers:🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀��🚀🚀🚀🚀🚀🚀"
  );

  // 添加健康检查处理器
  onBackgroundMessage("HEALTH_CHECK", async () => {
    console.log("🏥 Health check received");
    return { status: "ok", timestamp: Date.now() };
  });

  // GET_ACCOUNTS
  onBackgroundMessage("GET_ACCOUNTS", async () => {
    try {
      console.log("🚀 ~ onBackgroundMessage ~ GET_ACCOUNTS: START");
      const accounts = ["0x810D0b362bD1492Ad6aFEB723Dc3D6D9F7e4DC51"];
      console.log("🚀 ~ onBackgroundMessage ~ GET_ACCOUNTS: SUCCESS", accounts);
      return accounts;
    } catch (error) {
      console.error("❌ GET_ACCOUNTS failed:", error);
      return [];
    }
  });

  // GET_CHAIN_ID
  onBackgroundMessage("GET_CHAIN_ID", async () => {
    try {
      const state = turnkeyService.getWalletState();
      console.log(
        "🚀 ~ onBackgroundMessage ~ state.currentNetwork.chainId:",
        state.currentNetwork.chainId
      );
      return state.currentNetwork.chainId;
    } catch (error) {
      return NETWORKS[0].chainId;
    }
  });

  // GET_BLOCK_NUMBER
  onBackgroundMessage("GET_BLOCK_NUMBER", async () => {
    try {
      const blockNumber = await turnkeyService.getBlockNumber();
      // 按照以太坊 JSON-RPC 规范，返回十六进制格式的区块号
      return `0x${blockNumber.toString(16)}`;
    } catch (error) {
      console.error("Failed to get block number:", error);
      throw new Error(
        `Failed to get block number: ${(error as Error).message}`
      );
    }
  });

  // ETH_CALL
  onBackgroundMessage("ETH_CALL", async ({ data }) => {
    try {
      const result = await turnkeyService.ethCall(data.callData, data.blockTag);
      return result;
    } catch (error) {
      console.error("Failed to execute eth_call:", error);
      throw new Error(`eth_call failed: ${(error as Error).message}`);
    }
  });

  // WEB3_CLIENT_VERSION
  onBackgroundMessage("WEB3_CLIENT_VERSION", async () => {
    // 返回钱包的客户端版本信息
    return "SurfWallet/0.0.1";
  });

  // ETH_GET_CODE
  onBackgroundMessage("ETH_GET_CODE", async ({ data }) => {
    try {
      const code = await turnkeyService.getCode(data.address, data.blockTag);
      return code;
    } catch (error) {
      console.error("Failed to get contract code:", error);
      throw new Error(`eth_getCode failed: ${(error as Error).message}`);
    }
  });

  // ETH_GET_BLOCK_NUMBER
  onBackgroundMessage("ETH_GET_BLOCK_NUMBER", async () => {
    try {
      const blockNumber = await turnkeyService.getBlockNumber();
      // 按照以太坊 JSON-RPC 规范，返回十六进制格式的区块号
      return `0x${blockNumber.toString(16)}`;
    } catch (error) {
      console.error("Failed to get block number:", error);
      throw new Error(
        `Failed to get block number: ${(error as Error).message}`
      );
    }
  });

  // ETH_GET_TRANSACTION_BY_HASH
  onBackgroundMessage("ETH_GET_TRANSACTION_BY_HASH", async ({ data }) => {
    try {
      const transaction = await turnkeyService.getTransactionByHash(data.hash);
      return transaction;
    } catch (error) {
      console.error("Failed to get transaction by hash:", error);
      throw new Error(
        `eth_getTransactionByHash failed: ${(error as Error).message}`
      );
    }
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
    console.log("🚀 ~ onBackgroundMessage ~ SWITCH_CHAIN ~ data:", data);
    try {
      // 执行链切换
      turnkeyService.switchNetwork(data.chainId);

      // 验证切换是否成功
      const currentState = turnkeyService.getWalletState();
      if (currentState.currentNetwork.chainId !== data.chainId) {
        throw new Error(`Failed to switch to chain ${data.chainId}`);
      }

      console.log("🚀 ~ SWITCH_CHAIN ~ success ~ chainId:", data.chainId);
      return null;
    } catch (error) {
      console.error("🚀 ~ SWITCH_CHAIN ~ error:", error);
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
