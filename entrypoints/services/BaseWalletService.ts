/** @format */

import {
  NETWORKS,
  Network,
  WalletAccount,
  WalletState,
} from "@/entrypoints/types/wallet";
import { ethers } from "ethers";

export abstract class BaseWalletService {
  protected currentNetwork: Network = NETWORKS[0];

  // 抽象方法 - 子类必须实现
  abstract hasWallet(): Promise<boolean>;
  abstract loadWalletAuto(): Promise<boolean>;
  abstract getCurrentAccount(): WalletAccount | null;
  abstract getWalletState(): WalletState;
  abstract signMessage(message: string): Promise<string>;
  abstract personalSign(message: string): Promise<string>;
  abstract signTypedData(typedData: any): Promise<string>;
  abstract sendTransaction(
    to: string,
    amount: string,
    data?: `0x${string}`,
    gasPrice?: string
  ): Promise<string>;

  // 通用的存储方法
  protected async saveToStorage(key: string, value: any): Promise<void> {
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

  protected async getFromStorage(key: string): Promise<any> {
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

  // 通用的网络管理
  switchNetwork(chainId: number): void {
    const network = NETWORKS.find((n) => n.chainId === chainId);
    if (network) {
      this.currentNetwork = network;
    } else {
      throw new Error(`Network with chainId ${chainId} not found`);
    }
  }

  // 通用的余额查询
  async getBalance(address: string): Promise<string> {
    try {
      const provider = this.getProvider();
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }

  // 通用的区块号查询
  async getBlockNumber(): Promise<number> {
    try {
      const provider = this.getProvider();
      const blockNumber = await provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      console.error("Error fetching block number:", error);
      throw new Error(
        `Failed to fetch block number: ${(error as Error).message}`
      );
    }
  }

  // 通用的 eth_call 方法
  async ethCall(callData: any, blockTag: string = "latest"): Promise<string> {
    try {
      const provider = this.getProvider();

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

  // 通用的获取合约代码方法
  async getCode(address: string, blockTag: string = "latest"): Promise<string> {
    try {
      const provider = this.getProvider();
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

  // 通用的获取交易方法
  async getTransactionByHash(hash: string): Promise<any> {
    try {
      const provider = this.getProvider();
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

  // 获取当前网络
  getCurrentNetwork(): Network {
    return this.currentNetwork;
  }

  // 工具方法：检查地址是否有效
  protected isValidAddress(address: string): boolean {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  // 工具方法：格式化Wei到Ether
  protected formatEther(wei: string | bigint): string {
    return ethers.formatEther(wei);
  }

  // 工具方法：解析Ether到Wei
  protected parseEther(ether: string): bigint {
    return ethers.parseEther(ether);
  }

  // 工具方法：获取Provider
  protected getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(this.currentNetwork.rpcUrl);
  }
}
