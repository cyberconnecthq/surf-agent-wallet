/** @format */

export interface DebugCall {
  id: string;
  method: string;
  params: any[];
  status: "pending" | "success" | "error";
  result?: any;
  error?: string;
  timestamp: number;
  duration?: number;
}

export interface NetworkInfo {
  chainId: string;
  chainName: string;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  icon: string;
  usdValue?: string;
}

export interface WalletState {
  currentAddress: string;
  networkInfo: NetworkInfo;
  tokenBalances: TokenBalance[];
  isConnected: boolean;
  connectionStatus: string;
  portfolioValue: string;
}

export interface MessageData {
  type: string;
  method?: string;
  params?: any[];
  messageId?: string;
  result?: any;
  error?: string;
  event?: string;
  data?: any;
}
