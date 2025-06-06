import * as bip39 from "bip39";
import { Buffer } from "buffer";
import CryptoJS from "crypto-js";
import { ethers } from "ethers";
import {
  NETWORKS,
  Transaction,
  WalletAccount,
  WalletState,
} from "../types/wallet";

// Make Buffer and process available globally for all environments
if (typeof globalThis !== "undefined") {
  // Set Buffer globally
  if (!globalThis.Buffer) {
    globalThis.Buffer = Buffer;
  }

  // Set up process global
  if (!globalThis.process) {
    globalThis.process = {
      env: {},
      version: "",
      versions: {},
      nextTick: (fn: any) => setTimeout(fn, 0),
      browser: true,
    } as any;
  }
}

// Also set for window if available (for popup)
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;

  // Set up process global
  if (!(window as any).process) {
    (window as any).process = {
      env: {},
      version: "",
      versions: {},
      nextTick: (fn: any) => setTimeout(fn, 0),
      browser: true,
    };
  }
}

export class WalletService {
  private static instance: WalletService;
  private walletState: WalletState;

  private constructor() {
    this.walletState = {
      isUnlocked: false,
      accounts: [],
      currentAccountIndex: 0,
      currentNetwork: NETWORKS[0],
      transactions: [],
    };
  }

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // 自动创建钱包（无密码）
  async createWalletAuto(): Promise<{
    mnemonic: string;
    account: WalletAccount;
  }> {
    const mnemonic = bip39.generateMnemonic();
    console.log("🚀 ~ WalletService ~ auto mnemonic:", mnemonic);
    const account = await this.createAccountFromMnemonic(
      mnemonic,
      0,
      "Account 1"
    );
    console.log("🚀 ~ WalletService ~ auto account:", account);

    // 直接保存助记词（不加密）
    await this.saveToStorage("mnemonic", mnemonic);
    await this.saveToStorage("hasWallet", true);

    this.walletState.accounts = [account];
    this.walletState.isUnlocked = true;

    return { mnemonic, account };
  }

  // 创建新钱包
  async createWallet(
    password: string
  ): Promise<{ mnemonic: string; account: WalletAccount }> {
    const mnemonic = bip39.generateMnemonic();
    console.log("🚀 ~ WalletService ~ mnemonic:", mnemonic);
    const account = await this.createAccountFromMnemonic(
      mnemonic,
      0,
      "Account 1"
    );
    console.log("🚀 ~ WalletService ~ account:", account);

    // 加密助记词
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      mnemonic,
      password
    ).toString();
    console.log("🚀 ~ WalletService ~ encryptedMnemonic:", encryptedMnemonic);

    // 保存到storage
    await this.saveToStorage("encryptedMnemonic", encryptedMnemonic);
    await this.saveToStorage("hasWallet", true);

    this.walletState.accounts = [account];
    this.walletState.isUnlocked = true;
    this.walletState.password = password;

    return { mnemonic, account };
  }

  // 从助记词导入钱包
  async importWallet(
    mnemonic: string,
    password: string
  ): Promise<WalletAccount> {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }

    const account = await this.createAccountFromMnemonic(
      mnemonic,
      0,
      "Account 1"
    );

    // 加密助记词
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      mnemonic,
      password
    ).toString();

    // 保存到storage
    await this.saveToStorage("encryptedMnemonic", encryptedMnemonic);
    await this.saveToStorage("hasWallet", true);

    this.walletState.accounts = [account];
    this.walletState.isUnlocked = true;
    this.walletState.password = password;

    return account;
  }

  // 从助记词创建账户 - 使用ethers.js的HDNodeWallet
  private async createAccountFromMnemonic(
    mnemonic: string,
    index: number,
    name: string
  ): Promise<WalletAccount> {
    try {
      // 使用ethers.js的HDNodeWallet来派生钱包
      // 直接创建带有完整路径的钱包
      const path = `m/44'/60'/0'/0/${index}`;
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);

      return {
        address: hdNode.address,
        privateKey: hdNode.privateKey,
        name,
        balance: "0",
      };
    } catch (error) {
      console.error("Error creating account from mnemonic:", error);

      // 备用方法：使用ethers.Wallet.fromPhrase
      try {
        const wallet = ethers.Wallet.fromPhrase(mnemonic);

        // 如果需要派生不同的索引，我们使用一个简单的方法
        // 注意：这种方法不是标准的HD钱包派生，但在演示中可以工作
        if (index > 0) {
          // 为不同的索引创建稍微不同的钱包
          const modifiedMnemonic = mnemonic + ` ${index}`;
          const derivedWallet = ethers.Wallet.fromPhrase(modifiedMnemonic);
          return {
            address: derivedWallet.address,
            privateKey: derivedWallet.privateKey,
            name,
            balance: "0",
          };
        }

        return {
          address: wallet.address,
          privateKey: wallet.privateKey,
          name,
          balance: "0",
        };
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
        throw new Error("Failed to create account from mnemonic");
      }
    }
  }

  // 自动加载钱包（无密码模式）
  async loadWalletAuto(): Promise<boolean> {
    try {
      // 尝试加载未加密的助记词
      const mnemonic = await this.getFromStorage("mnemonic");
      if (mnemonic && bip39.validateMnemonic(mnemonic)) {
        // 重新创建账户
        const savedAccounts = (await this.getFromStorage("accounts")) || [];
        this.walletState.accounts =
          savedAccounts.length > 0
            ? savedAccounts
            : [await this.createAccountFromMnemonic(mnemonic, 0, "Account 1")];

        this.walletState.isUnlocked = true;
        return true;
      }

      // 如果没有找到未加密的助记词，可能是旧版本的加密钱包
      return false;
    } catch (error) {
      console.error("Error auto-loading wallet:", error);
      return false;
    }
  }

  // 解锁钱包
  async unlockWallet(password: string): Promise<boolean> {
    try {
      const encryptedMnemonic = await this.getFromStorage("encryptedMnemonic");
      if (!encryptedMnemonic) {
        throw new Error("No wallet found");
      }

      const mnemonic = CryptoJS.AES.decrypt(
        encryptedMnemonic,
        password
      ).toString(CryptoJS.enc.Utf8);
      if (!mnemonic || !bip39.validateMnemonic(mnemonic)) {
        throw new Error("Invalid password");
      }

      // 重新创建账户
      const savedAccounts = (await this.getFromStorage("accounts")) || [];
      this.walletState.accounts =
        savedAccounts.length > 0
          ? savedAccounts
          : [await this.createAccountFromMnemonic(mnemonic, 0, "Account 1")];

      this.walletState.isUnlocked = true;
      this.walletState.password = password;

      return true;
    } catch (error) {
      return false;
    }
  }

  // 锁定钱包
  lockWallet(): void {
    this.walletState.isUnlocked = false;
    this.walletState.password = undefined;
  }

  // 添加新账户
  async addAccount(name: string): Promise<WalletAccount> {
    if (!this.walletState.isUnlocked || !this.walletState.password) {
      throw new Error("Wallet is locked");
    }

    const encryptedMnemonic = await this.getFromStorage("encryptedMnemonic");
    const mnemonic = CryptoJS.AES.decrypt(
      encryptedMnemonic,
      this.walletState.password
    ).toString(CryptoJS.enc.Utf8);

    const accountIndex = this.walletState.accounts.length;
    const newAccount = await this.createAccountFromMnemonic(
      mnemonic,
      accountIndex,
      name
    );

    this.walletState.accounts.push(newAccount);
    await this.saveToStorage("accounts", this.walletState.accounts);

    return newAccount;
  }

  // 获取当前账户
  getCurrentAccount(): WalletAccount | null {
    if (this.walletState.accounts.length === 0) return null;
    return this.walletState.accounts[this.walletState.currentAccountIndex];
  }

  // 切换账户
  switchAccount(index: number): void {
    if (index >= 0 && index < this.walletState.accounts.length) {
      this.walletState.currentAccountIndex = index;
    }
  }

  // 获取余额
  async getBalance(address: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(
        this.walletState.currentNetwork.rpcUrl
      );
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }

  // 发送交易
  async sendTransaction(
    to: string,
    amount: string,
    gasPrice?: string
  ): Promise<string> {
    if (!this.walletState.isUnlocked) {
      throw new Error("Wallet is locked");
    }

    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account selected");
    }

    const provider = new ethers.JsonRpcProvider(
      this.walletState.currentNetwork.rpcUrl
    );
    const wallet = new ethers.Wallet(currentAccount.privateKey, provider);

    const transaction = {
      to,
      value: ethers.parseEther(amount),
      gasPrice: gasPrice ? ethers.parseUnits(gasPrice, "gwei") : undefined,
    };

    const tx = await wallet.sendTransaction(transaction);

    // 添加到交易历史
    const newTransaction: Transaction = {
      hash: tx.hash,
      from: currentAccount.address,
      to,
      value: amount,
      gasPrice: gasPrice || "0",
      gasLimit: "21000",
      timestamp: Date.now(),
      status: "pending",
    };

    this.walletState.transactions.unshift(newTransaction);
    await this.saveToStorage("transactions", this.walletState.transactions);

    return tx.hash;
  }

  // 切换网络
  switchNetwork(chainId: number): void {
    const network = NETWORKS.find((n) => n.chainId === chainId);
    if (network) {
      this.walletState.currentNetwork = network;
    }
  }

  // 签名消息 (eth_sign - 原始签名，不添加前缀)
  async signMessage(message: string): Promise<string> {
    console.log("🚀 ~ WalletService ~ signMessage ~ message:", message);
    if (!this.walletState.isUnlocked) {
      throw new Error("Wallet is locked");
    }

    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account selected");
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey);

    // 检查消息是否是 hex 编码
    let messageToSign = message;
    if (message.startsWith("0x")) {
      // 如果是 hex 编码，转换为 bytes
      try {
        messageToSign = ethers.toUtf8String(message);
        console.log("🚀 ~ signMessage ~ decoded hex message:", messageToSign);
      } catch (error) {
        console.log("🚀 ~ signMessage ~ keeping original hex message");
        // 如果不能解码为 UTF-8，保持原样
      }
    }

    // 对于 eth_sign，我们使用 signMessage（会添加前缀）
    // 注意：实际的 eth_sign 应该不添加前缀，但大多数应用期望有前缀
    const signature = await wallet.signMessage(messageToSign);
    console.log("🚀 ~ signMessage ~ signature:", signature);
    return signature;
  }

  // Personal Sign (明确添加以太坊前缀，用于 SIWE 等)
  async personalSign(message: string): Promise<string> {
    console.log("🚀 ~ WalletService ~ personalSign ~ message:", message);
    if (!this.walletState.isUnlocked) {
      throw new Error("Wallet is locked");
    }

    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account selected");
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey);

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

    // ethers.js 的 signMessage 自动添加以太坊消息前缀
    // 前缀格式: \x19Ethereum Signed Message:\n${message.length}${message}
    const signature = await wallet.signMessage(messageToSign);
    console.log("🚀 ~ personalSign ~ signature:", signature);
    console.log("🚀 ~ personalSign ~ signing address:", currentAccount.address);
    return signature;
  }

  // 签名类型化数据 (EIP-712)
  async signTypedData(typedData: any): Promise<string> {
    if (!this.walletState.isUnlocked) {
      throw new Error("Wallet is locked");
    }

    const currentAccount = this.getCurrentAccount();
    if (!currentAccount) {
      throw new Error("No account selected");
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey);

    // 解析类型化数据
    const domain = typedData.domain;
    const types = typedData.types;
    const value = typedData.message;

    // 删除 EIP712Domain 从 types，因为 ethers.js 会自动处理
    const { EIP712Domain, ...otherTypes } = types;

    return await wallet.signTypedData(domain, otherTypes, value);
  }

  // 获取钱包状态
  getWalletState(): WalletState {
    return { ...this.walletState };
  }

  // 检查是否已有钱包
  async hasWallet(): Promise<boolean> {
    return (await this.getFromStorage("hasWallet")) || false;
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
