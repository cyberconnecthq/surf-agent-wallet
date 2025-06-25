/** @format */

import {
  NETWORKS,
  Transaction,
  WalletAccount,
  WalletState,
} from "@/entrypoints/types/wallet";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/ethers";
import { TurnkeyClient } from "@turnkey/http";
import { ethers } from "ethers";
import { BaseWalletService } from "./BaseWalletService";
import {
  globalGenerateAPIKeyFormat as _globalGenerateAPIKeyFormat,
  getFromStorage,
} from "./generateAPIKey";
import { fetchMe, pollingSessionStatus, pollingTokens } from "./surfApiService";
const baseUrl = "https://api.turnkey.com";

// 将 generateAPIKeyFormat 和 getStoredAPIKeyFormat 暴露到 globalThis
declare global {
  var generateSurfPublicKey: typeof _globalGenerateAPIKeyFormat;
}

globalThis.generateSurfPublicKey = _globalGenerateAPIKeyFormat;

export class TurnkeyService extends BaseWalletService {
  private static instance: TurnkeyService;
  // private keyPair?: Keypair;
  private httpClient?: TurnkeyClient;
  private organizationId?: string;
  private walletAccounts?: {
    sol: WalletAccount;
    evm: WalletAccount;
  };

  constructor() {
    super();
    this.init();
  }

  static getInstance(): TurnkeyService {
    if (!TurnkeyService.instance) {
      TurnkeyService.instance = new TurnkeyService();
    }
    return TurnkeyService.instance;
  }

  get isReady() {
    return Boolean(this.httpClient);
  }

  // 轮询等待外部生成 keypair
  private async waitForKeypair(
    maxRetries = 600,
    intervalMs = 300
  ): Promise<{ publicKey: string; privateKey: string }> {
    let retries = 0;

    // // // the demo agent keypair
    // const publicKey =
    //   "03195893b2f3851cc45959391e6f70b04f18d5e949305b952b0cc985aa42237ed8";
    // const privateKey =
    //   "271e0595a182b78041665deab59b74bf32c8a8eea02e534c64529a4d1470c944";
    // const organizationId = "5faa0997-e4a4-4f21-8385-ca1113c32264";

    // this.organizationId = organizationId;
    // return {
    //   publicKey,
    //   privateKey,
    // };

    while (retries < maxRetries) {
      const keyPair = await getFromStorage();

      if (keyPair) {
        console.log("🔑 Found external generated keypair");
        return keyPair;
      }

      console.log(`🔄 Waiting for keypair... (${retries + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      retries++;
    }

    throw new Error(
      "❌ Timeout waiting for external keypair generation. Please call globalThis.generateAPIKeyFormat() first."
    );
  }

  async init() {
    // 轮询等待外部生成 keypair
    console.log("🔑 Waiting for external keypair generation...");
    let keyPair = await this.waitForKeypair();

    const { publicKey, privateKey } = keyPair;

    const { ENV, ACCESS_TOKEN, SESSION_ID } = await pollingTokens();

    const { data } = await pollingSessionStatus({
      sessionId: SESSION_ID,
      accessToken: ACCESS_TOKEN,
    });

    if (data.status === "RUNNING") {
      const me = await fetchMe(ACCESS_TOKEN);

      this.organizationId = me.data.turnkey_sub_org.id;

      const walletAccouts = {
        sol: {
          address: me.data.turnkey_sub_org.default_sol_addr || "",
          privateKey: "",
          name: "SOL",
          balance: "0",
        },
        evm: {
          address: me.data.turnkey_sub_org.default_eth_addr || "",
          privateKey: "",
          name: "EVM",
          balance: "0",
        },
      };

      this.walletAccounts = walletAccouts;
    }

    // const walletAccouts = {
    //   sol: {
    //     address: "0x0000000000000000000000000000000000000000",
    //     privateKey: "",
    //     name: "SOL",
    //     balance: "0",
    //   },
    //   evm: {
    //     address: "0x810D0b362bD1492Ad6aFEB723Dc3D6D9F7e4DC51",
    //     privateKey: "",
    //     name: "EVM",
    //     balance: "0",
    //   },
    // };

    // this.walletAccounts = walletAccouts;

    try {
      const stamper = new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      });

      const httpClient = new TurnkeyClient({ baseUrl }, stamper);

      this.httpClient = httpClient;
      const wallets = await this.getWallets();
      console.log("🚀 ~ TurnkeyService ~ init ~ wallets:", wallets);

      if (wallets) {
        await this.saveToStorage("hasWallet", true);
      }
    } catch (error) {
      console.error("🚀 ~ TurnkeyClient ~ init ~ error:", error);
    }
  }

  async hasWallet() {
    return (await this.getFromStorage("hasWallet")) || false;
  }

  async loadWalletAuto(): Promise<boolean> {
    try {
      const wallets = await this.getWallets();
      return Boolean(wallets);
    } catch (error) {
      console.error("Error auto-loading Turnkey wallet:", error);
      return false;
    }
  }

  async getWallets() {
    return this.walletAccounts;
  }

  // Get current account (equivalent to WalletService.getCurrentAccount)
  getCurrentAccount(): WalletAccount | null {
    // Return EVM account by default
    return this.walletAccounts?.evm || null;
  }

  // Send transaction (simplified version - will use Turnkey signing in real implementation)
  async sendTransaction(
    to: string,
    amount: string,
    data?: `0x${string}`,
    gasPrice?: string
  ): Promise<string> {
    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account available for signing");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    if (!this.httpClient) {
      throw new Error("HttpClient is not initialized");
    }

    const provider = this.getProvider();

    // Build the transaction object with proper defaults
    const transaction: any = {
      to,
      value: this.parseEther(amount),
      data: data || "0x", // Ensure data is always defined
    };

    // Add gas price if provided
    if (gasPrice) {
      transaction.gasPrice = ethers.parseUnits(gasPrice, "gwei");
    }

    console.log(
      "🚀 ~ TurnkeyService ~ transaction before gas estimation:",
      transaction
    );

    const signer = new TurnkeySigner({
      client: this.httpClient,
      organizationId: this.organizationId,
      signWith: currentAccount.address,
    });

    const connectedSigner = signer.connect(provider);

    try {
      // First, let's estimate gas to catch any issues early
      const gasEstimate = await connectedSigner.estimateGas(transaction);
      transaction.gasLimit = gasEstimate;

      console.log("🚀 ~ TurnkeyService ~ gasEstimate:", gasEstimate.toString());

      // Check if we have sufficient balance
      const balance = await provider.getBalance(currentAccount.address);
      const totalCost =
        transaction.value +
        gasEstimate *
          (transaction.gasPrice ||
            (await provider.getFeeData().then((fee) => fee.gasPrice || 0n)));

      if (balance < totalCost) {
        throw new Error(
          `Insufficient balance. Required: ${this.formatEther(
            totalCost
          )} ETH, Available: ${this.formatEther(balance)} ETH`
        );
      }

      // Send the transaction
      const tx = await connectedSigner.sendTransaction(transaction);

      console.log("🚀 ~ TurnkeyService ~ sendTransaction ~ tx:", tx);

      // 添加到交易历史
      const newTransaction: Transaction = {
        hash: tx.hash,
        from: currentAccount.address,
        to,
        value: amount,
        gasPrice: gasPrice || "0",
        gasLimit: gasEstimate.toString(),
        timestamp: Date.now(),
        status: "pending",
      };

      return tx.hash;
    } catch (error) {
      console.error("🚀 ~ TurnkeyService ~ sendTransaction ~ error:", error);

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds for transaction");
        } else if (error.message.includes("gas")) {
          throw new Error(`Gas estimation failed: ${error.message}`);
        } else if (error.message.includes("revert")) {
          throw new Error(`Transaction would fail: ${error.message}`);
        }
      }

      throw error;
    }
  }

  // Sign message (simplified version - will use Turnkey signing in real implementation)
  async signMessage(message: string): Promise<string> {
    console.log("🚀 ~ TurnkeyService ~ signMessage ~ message:", message);
    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account available for signing");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    if (!this.httpClient) {
      throw new Error("HttpClient is not initialized");
    }

    const signer = new TurnkeySigner({
      client: this.httpClient,
      organizationId: this.organizationId,
      signWith: currentAccount.address,
    });

    // 检查消息是否是 hex 编码
    let messageToSign = message;
    if (message.startsWith("0x")) {
      // 如果是 hex 编码，转换为 UTF-8 字符串
      try {
        messageToSign = ethers.toUtf8String(message);
        console.log("🚀 ~ personalSign ~ decoded hex message:", messageToSign);
      } catch (error) {
        console.log("🚀 ~ personalSign ~ keeping original hex message");
        // 如果不能解码为 UTF-8，保持原样
      }
    }

    const signature = await signer.signMessage(messageToSign);
    console.log("🚀 ~ TurnkeyService ~ signMessage ~ signature:", signature);

    return signature;
  }

  // Personal sign (simplified version - will use Turnkey signing in real implementation)
  async personalSign(message: string): Promise<string> {
    console.log("🚀 ~ TurnkeyService ~ personalSign ~ message:", message);
    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account available for signing");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    if (!this.httpClient) {
      throw new Error("HttpClient is not initialized");
    }

    // 检查消息是否是 hex 编码
    let messageToSign = message;
    if (message.startsWith("0x")) {
      // 如果是 hex 编码，转换为 UTF-8 字符串
      try {
        messageToSign = ethers.toUtf8String(message);
        console.log("🚀 ~ personalSign ~ decoded hex message:", messageToSign);
      } catch (error) {
        console.log("🚀 ~ personalSign ~ keeping original hex message");
        // 如果不能解码为 UTF-8，保持原样
      }
    }
    console.log(
      "🚀 ~ TurnkeyService ~ personalSign ~ this.organizationId:",
      this.organizationId
    );

    const signer = new TurnkeySigner({
      client: this.httpClient,
      organizationId: this.organizationId,
      signWith: currentAccount.address,
    });

    const signature = await signer.signMessage(messageToSign);
    console.log("🚀 ~ TurnkeyService ~ personalSign ~ signature:", signature);

    return signature;
  }

  // Sign typed data (EIP-712) - uses Turnkey signing implementation
  async signTypedData(typedData: any): Promise<string> {
    console.log("🚀 ~ TurnkeyService ~ signTypedData ~ typedData:", typedData);
    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account available for signing");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    if (!this.httpClient) {
      throw new Error("HttpClient is not initialized");
    }

    const signer = new TurnkeySigner({
      client: this.httpClient,
      organizationId: this.organizationId,
      signWith: currentAccount.address,
    });

    try {
      // Parse the typed data structure
      const domain = typedData.domain;
      const types = typedData.types;
      const message = typedData.message || typedData.value;

      // Remove EIP712Domain from types as ethers.js handles it automatically
      const { EIP712Domain, ...otherTypes } = types;

      console.log("🚀 ~ signTypedData ~ domain:", domain);
      console.log("🚀 ~ signTypedData ~ types:", otherTypes);
      console.log("🚀 ~ signTypedData ~ message:", message);

      // Use TurnkeySigner to sign the typed data
      const signature = await signer.signTypedData(domain, otherTypes, message);

      return signature;
    } catch (error) {
      console.error("🚀 ~ TurnkeyService ~ signTypedData ~ error:", error);
      throw new Error(`Failed to sign typed data: ${(error as Error).message}`);
    }
  }

  getWalletState(): WalletState {
    const accounts = [
      this.walletAccounts?.evm,
      this.walletAccounts?.sol,
    ].filter((w) => !!w);

    return {
      isUnlocked: true,
      accounts: accounts,
      currentAccountIndex: 0,
      currentNetwork: this.getCurrentNetwork(),
      transactions: [],
    };
  }

  async whoami() {
    const client = this.httpClient;

    if (!client) {
      throw new Error("HttpClient is not initialized");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    const user = await client.getWhoami({
      organizationId: this.organizationId,
    });

    console.log("🚀 ~ TurnkeyClient ~ whoami ~ user:", user);

    return user;
  }

  async sendTransactionWithTurnkey(transaction: Transaction) {
    const client = this.httpClient;

    if (!client) {
      throw new Error("HttpClient is not initialized");
    }

    if (!this.organizationId) {
      throw new Error("OrganizationId is not initialized");
    }

    const response = await client.signTransaction({
      type: "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
      timestampMs: Date.now().toString(),
      organizationId: this.organizationId,
      parameters: {
        signWith: "API_KEY",
        unsignedTransaction: "",
        type: "TRANSACTION_TYPE_ETHEREUM",
      },
    });
  }

  async getWalletCapabilities(
    address: string,
    chainIds?: string[]
  ): Promise<Record<string, any>> {
    // 验证地址是否为当前账户
    const currentAccount = this.getCurrentAccount();
    if (
      !currentAccount ||
      currentAccount.address.toLowerCase() !== address.toLowerCase()
    ) {
      throw new Error("Address not found or not connected");
    }

    // 获取所有支持的网络
    const supportedNetworks = NETWORKS;

    // 如果指定了 chainIds，只返回这些链的能力
    const targetChainIds =
      chainIds ||
      supportedNetworks.map((n: any) => `0x${n.chainId.toString(16)}`);

    const capabilities: Record<string, any> = {};

    // 添加所有链都支持的通用能力
    capabilities["0x0"] = {
      "flow-control": {
        supported: true,
      },
    };

    // 为每个请求的链添加特定能力
    for (const chainIdHex of targetChainIds) {
      const chainId = parseInt(chainIdHex, 16);
      const network = supportedNetworks.find((n: any) => n.chainId === chainId);

      if (network) {
        capabilities[chainIdHex] = {
          atomic: {
            status: "supported", // 当前实现支持原子执行
          },
          paymasterService: {
            supported: false, // 暂时不支持 paymaster
          },
        };
      }
    }

    return capabilities;
  }
}
