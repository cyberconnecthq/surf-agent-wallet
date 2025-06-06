import { defineExtensionMessaging } from "@webext-core/messaging";

// 定义扩展消息协议接口（isolated world <-> background）
export interface WalletProtocolMap {
  GET_ACCOUNTS(): string[];
  GET_CHAIN_ID(): number;
  GET_BALANCE(data: { address: string; blockTag?: string }): string;
  SEND_TRANSACTION(transactionParam: any): string;
  SIGN_MESSAGE(data: { address: string; message: string }): string;
  PERSONAL_SIGN(data: { message: string; address: string }): string;
  SIGN_TYPED_DATA(data: { address: string; typedData: any }): string;
  SWITCH_CHAIN(data: { chainId: number }): null;
  ADD_CHAIN(chainParam: any): any;

  // Popup相关消息
  GET_WALLET_STATE(): any;
  HAS_WALLET(): boolean;
  GET_CURRENT_ACCOUNT(): any;
  REFRESH_BALANCE(data: { address: string }): string;
  SEND_TRANSACTION_FROM_POPUP(data: { to: string; amount: string }): string;
}

// 创建扩展消息系统（用于 isolated world 和 background 之间）
export const { sendMessage: sendToBackground, onMessage: onBackgroundMessage } =
  defineExtensionMessaging<WalletProtocolMap>();
