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
import { Keypair } from "./type";

const baseUrl = "https://api.turnkey.com";

//  TODO:  get this keypair and organizationId from api  via SESSION_ID in managed storage
// const organizationId = "1f1295c3-c0fe-40ee-aea7-253ee8ede227";
// const apiPublicKey =
//   "03ec4abd879d323765b33b32ec25d950a2f9380eec8188edf0a155a39b379b8b36";
// const apiPrivateKey =
//   "28b83e4371139906bda6f95b19c4254d4e0b3bb1123ed073acadf888144dea8d";

export class TurnkeyService {
  private static instance: TurnkeyService;
  private keyPair?: Keypair;
  private httpClient?: TurnkeyClient;
  private organizationId?: string;
  private walletAccounts?: {
    sol: WalletAccount;
    evm: WalletAccount;
  };
  private currentNetwork = NETWORKS[0];

  constructor() {
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

  async init() {
    // TODO: we need generate agent keypair here in real world
    // const { publicKey, privateKey } = await generateAPIKeyFormat();

    try {
      // the demo agent keypair
      const publicKey =
        "02e4f8f3ef743697cdcfb5255b8cb13a96068b27e2b117a60bf4a20756fff87018";
      const privateKey =
        "f2d4f25bcbbf2e8d0502dff60b277b5305536503a2a58c91fe4e88c825283a95";
      const organizationId = "5faa0997-e4a4-4f21-8385-ca1113c32264";

      const stamper = new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      });

      const httpClient = new TurnkeyClient({ baseUrl }, stamper);

      this.keyPair = { publicKey, privateKey };
      this.httpClient = httpClient;
      this.organizationId = organizationId;
      const wallets = await this.getWallets();
      console.log("🚀 ~ TurnkeyService ~ init ~ wallets:", wallets);

      if (wallets) {
        await this.saveToStorage("hasWallet", true);
      }

      // TODO: add actual logic
      // const { isSuccess, user } = await this.createUser({
      //   publicKey,
      //   privateKey,
      // });

      // if (isSuccess) {
      //   const stamper = new ApiKeyStamper({
      //     apiPublicKey: publicKey,
      //     apiPrivateKey: privateKey,
      //   });

      //   const httpClient = new TurnkeyHttpClient({ baseUrl }, stamper);

      //   this.keyPair = { publicKey, privateKey };
      //   this.httpClient = httpClient;
      // }
    } catch (error) {
      console.error("🚀 ~ TurnkeyClient ~ init ~ error:", error);
    }
  }
  // TODO: revert this function in real world
  // async createUser(keyPair: Keypair) {
  //   const stamper = new ApiKeyStamper({
  //     apiPublicKey: apiPublicKey,
  //     apiPrivateKey: apiPrivateKey,
  //   });

  //   const httpClient = new TurnkeyHttpClient({ baseUrl }, stamper);
  //   const user = await httpClient.createUsers({
  //     type: "ACTIVITY_TYPE_CREATE_USERS_V3",
  //     timestampMs: Date.now().toString(),
  //     organizationId: organizationId,
  //     parameters: {
  //       users: [
  //         {
  //           userName: "extension@1",
  //           apiKeys: [
  //             {
  //               apiKeyName: "extension@1",
  //               publicKey: keyPair.publicKey,
  //               curveType: "API_KEY_CURVE_P256",
  //             },
  //           ],
  //           authenticators: [],
  //           userTags: [],
  //           oauthProviders: [],
  //         },
  //       ],
  //     },
  //   });

  //   return {
  //     isSuccess: user.activity.status === "ACTIVITY_STATUS_COMPLETED",
  //     user,
  //   };
  // }

  async hasWallet() {
    return (await this.getFromStorage("hasWallet")) || false;
  }

  // Auto load wallet (equivalent to WalletService.loadWalletAuto)
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
    // if (!this.organizationId) {
    //   throw new Error("OrganizationId is not initialized");
    // }

    // TODO: revert this in real world
    // const walletId = await this.httpClient
    //   ?.getWallets({
    //     organizationId: this.organizationId,
    //   })
    //   .then((res) => res.wallets[0].walletId);

    // if (!walletId) {
    //   throw new Error("Wallet is not initialized");
    // }

    // const wallets = await this.httpClient
    //   ?.getWalletAccounts({
    //     organizationId: this.organizationId,
    //     walletId: walletId,
    //   })
    //   .then((res) => res.accounts);

    // if (wallets) {
    //   const sol = wallets.find(
    //     (w) => w.addressFormat === "ADDRESS_FORMAT_SOLANA"
    //   );

    //   const evm = wallets.find(
    //     (w) => w.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
    //   );

    //   this.walletAccounts = {
    //     sol: {
    //       address: sol?.address || "",
    //       privateKey: "",
    //       name: sol?.walletId || "",
    //       balance: "0",
    //     },
    //     evm: {
    //       address: evm?.address || "",
    //       privateKey: "",
    //       name: evm?.walletId || "",
    //       balance: "0",
    //     },
    //   };

    //   return {
    //     sol,
    //     evm,
    //   };
    // }

    // return undefined;

    const wallets = {
      sol: {
        address: "56UWMErnkF9wTAEk7DHxw2dHSUUspXTeFS5LrPUrCrQD",
        privateKey: "",
        name: "SOL",
        balance: "0",
      },
      evm: {
        address: "0x810D0b362bD1492Ad6aFEB723Dc3D6D9F7e4DC51",
        privateKey: "",
        name: "EVM",
        balance: "0",
      },
    };
    this.walletAccounts = wallets;

    return wallets;
  }

  // Get current account (equivalent to WalletService.getCurrentAccount)
  getCurrentAccount(): WalletAccount | null {
    // Return EVM account by default
    return this.walletAccounts?.evm || null;
  }

  // Get balance for an address
  async getBalance(address: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }

  // Get current block number
  async getBlockNumber(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.error("Error fetching block number:", error);
      throw new Error(
        `Failed to fetch block number: ${(error as Error).message}`
      );
    }
  }

  // Execute eth_call - call a contract function without sending a transaction
  async ethCall(callData: any, blockTag: string = "latest"): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);

      // Prepare transaction object with normalized addresses
      const transaction: any = {
        data: callData.data,
        value: callData.value || "0x0",
      };

      // Normalize 'to' address if provided
      if (callData.to) {
        transaction.to = ethers.getAddress(callData.to);
      }

      // Normalize 'from' address if provided
      if (callData.from) {
        transaction.from = ethers.getAddress(callData.from);
      }

      // Add gas parameters if provided
      if (callData.gas) {
        transaction.gas = callData.gas;
      }
      if (callData.gasPrice) {
        transaction.gasPrice = callData.gasPrice;
      }

      // Use send method for raw JSON-RPC call
      const result = await provider.send("eth_call", [transaction, blockTag]);
      return result;
    } catch (error) {
      console.error("Error executing eth_call:", error);
      throw new Error(
        `Failed to execute eth_call: ${(error as Error).message}`
      );
    }
  }

  // Get contract code at address
  async getCode(address: string, blockTag: string = "latest"): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      // Normalize address to proper checksum format
      const normalizedAddress = ethers.getAddress(address);
      // Use send method for raw JSON-RPC call with blockTag support
      const code = await provider.send("eth_getCode", [
        normalizedAddress,
        blockTag,
      ]);
      return code;
    } catch (error) {
      console.error("Error fetching contract code:", error);
      throw new Error(
        `Failed to fetch contract code: ${(error as Error).message}`
      );
    }
  }

  // Get transaction by hash
  async getTransactionByHash(hash: string): Promise<any> {
    try {
      const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
      // Use send method for raw JSON-RPC call
      const transaction = await provider.send("eth_getTransactionByHash", [
        hash,
      ]);
      return transaction;
    } catch (error) {
      console.error("Error fetching transaction by hash:", error);
      throw new Error(
        `Failed to fetch transaction by hash: ${(error as Error).message}`
      );
    }
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

    const provider = new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);

    // Build the transaction object with proper defaults
    const transaction: any = {
      to,
      value: ethers.parseEther(amount),
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
          `Insufficient balance. Required: ${ethers.formatEther(
            totalCost
          )} ETH, Available: ${ethers.formatEther(balance)} ETH`
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

  // Switch network
  switchNetwork(chainId: number): void {
    console.log("🚀 ~ TurnkeyService ~ switchNetwork ~ chainId:", chainId);
    const network = NETWORKS.find((n) => n.chainId === chainId);
    console.log("🚀 ~ TurnkeyService ~ switchNetwork ~ network:", network);
    if (network) {
      this.currentNetwork = network;
    } else {
      throw new Error(`Network with chainId ${chainId} not found`);
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
      currentNetwork: this.currentNetwork,
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

  // Storage 辅助方法
  private async saveToStorage(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      if (typeof browser !== "undefined" && browser.storage) {
        browser.storage.local.set({ [key]: value }, resolve);
      } else if (
        typeof window !== "undefined" &&
        (window as any).chrome?.storage
      ) {
        (window as any).chrome.storage.local.set({ [key]: value }, resolve);
      } else {
        // Fallback to localStorage for development
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  private async getFromStorage(key: string): Promise<any> {
    return new Promise((resolve) => {
      if (typeof browser !== "undefined" && browser.storage) {
        browser.storage.local.get([key], (result) => {
          resolve(result[key]);
        });
      } else if (
        typeof window !== "undefined" &&
        (window as any).chrome?.storage
      ) {
        (window as any).chrome.storage.local.get([key], (result: any) => {
          resolve(result[key]);
        });
      } else {
        // Fallback to localStorage for development
        const value = localStorage.getItem(key);
        resolve(value ? JSON.parse(value) : undefined);
      }
    });
  }
}
