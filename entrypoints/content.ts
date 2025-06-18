/** @format */

import { sendToBackground } from "../utils/messaging";

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "ISOLATED",
  runAt: "document_start",
  main() {
    // 在 ISOLATED world 中处理与 background 的通信
    setupIsolatedWorldHandler();

    // 通知 MAIN world 消息处理器已准备好
    window.postMessage(
      {
        type: "WALLET_ISOLATED_READY",
        timestamp: Date.now(),
      },
      "*"
    );
  },
});

function setupIsolatedWorldHandler() {
  let requestCounter = 0;
  const processingRequests = new Set<string>();

  // 监听来自 MAIN world 的消息
  window.addEventListener("message", async (event) => {
    if (
      event.source !== window ||
      event.data.type !== "WALLET_REQUEST_TO_BACKGROUND"
    ) {
      return;
    }

    const { method, params, messageId } = event.data;
    const requestId = `${method}:${JSON.stringify(params || [])}`;
    requestCounter++;

    // 检查是否有相同的请求正在处理
    if (processingRequests.has(requestId)) {
      console.warn("⚠️ Duplicate request detected:", requestId);
    }
    processingRequests.add(requestId);

    try {
      const result = await handleWalletRequest(method, params);

      window.postMessage(
        {
          type: "WALLET_RESPONSE_FROM_BACKGROUND",
          messageId,
          result,
        },
        "*"
      );
    } catch (error) {
      console.error("❌ Content script handling failed:", {
        method,
        messageId,
        requestId,
        error: (error as Error).message,
        counter: requestCounter,
      });
      window.postMessage(
        {
          type: "WALLET_RESPONSE_FROM_BACKGROUND",
          messageId,
          error: (error as Error).message,
        },
        "*"
      );
    } finally {
      processingRequests.delete(requestId);
    }
  });
}

// 处理钱包请求（在 ISOLATED world 中运行）
async function handleWalletRequest(method: string, params: any[] = []) {
  switch (method) {
    case "health_check":
      return await sendToBackground("HEALTH_CHECK", undefined);

    case "eth_requestAccounts":
      return await requestAccounts();

    case "eth_accounts":
      const accounts = await getAccounts();
      return accounts;

    case "eth_chainId":
      const chainId = await getChainId();
      return await getChainId();

    case "net_version":
      return await getNetworkVersion();

    case "eth_getBalance":
      return await getBalance(params[0], params[1]);

    case "eth_sendTransaction":
      return await sendTransaction(params[0]);

    case "eth_sign":
      return await signMessage(params[0], params[1]);

    case "personal_sign":
      return await personalSign(params[0], params[1]);

    case "eth_signTypedData_v4":
      return await signTypedData(params[0], params[1]);

    case "wallet_switchEthereumChain":
      return await switchChain(params[0]);

    case "wallet_addEthereumChain":
      return await addChain(params[0]);

    case "eth_call":
      return await ethCall(params[0], params[1]);

    case "web3_clientVersion":
      return await getClientVersion();

    case "eth_getCode":
      return await getCode(params[0], params[1]);

    case "eth_blockNumber":
      return await getBlockNumber();

    case "eth_getTransactionByHash":
      return await getTransactionByHash(params[0]);

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

// 实现各种 Web3 方法（在 ISOLATED world 中运行）
async function requestAccounts() {
  const result = await sendToBackground("GET_ACCOUNTS", undefined);

  // 触发连接事件
  window.postMessage(
    {
      type: "WALLET_EVENT",
      event: "connect",
      data: { chainId: await getChainId() },
    },
    "*"
  );

  // 触发账户变更事件
  window.postMessage(
    {
      type: "WALLET_EVENT",
      event: "accountsChanged",
      data: result,
    },
    "*"
  );

  return result;
}

async function getAccounts() {
  return await sendToBackground("GET_ACCOUNTS", undefined);
}

async function getChainId() {
  const result = await sendToBackground("GET_CHAIN_ID", undefined);

  return `0x${(result as number).toString(16)}`;
}

async function getNetworkVersion() {
  const result = await sendToBackground("GET_CHAIN_ID", undefined);
  return (result as number).toString();
}

async function getBalance(address: string, blockTag: string = "latest") {
  return await sendToBackground("GET_BALANCE", { address, blockTag });
}

async function sendTransaction(transactionParam: any) {
  // 自动签名并发送交易
  return await sendToBackground("SEND_TRANSACTION", transactionParam);
}

async function signMessage(address: string, message: string) {
  return await sendToBackground("SIGN_MESSAGE", { address, message });
}

async function personalSign(message: string, address: string) {
  return await sendToBackground("PERSONAL_SIGN", { message, address });
}

async function signTypedData(address: string, typedData: any) {
  return await sendToBackground("SIGN_TYPED_DATA", { address, typedData });
}

async function switchChain(chainParam: { chainId: string }) {
  const chainId = parseInt(chainParam.chainId, 16);

  const currentChainId = await getChainId();

  if (currentChainId === chainParam.chainId) return null;

  try {
    // 等待后台确认切换完成
    await sendToBackground("SWITCH_CHAIN", { chainId });

    // 只有在后台确认成功后才触发事件
    window.postMessage(
      {
        type: "WALLET_EVENT",
        event: "chainChanged",
        data: chainParam.chainId,
      },
      "*"
    );

    return null;
  } catch (error) {
    throw error;
  }
}

async function addChain(chainParam: any) {
  return await sendToBackground("ADD_CHAIN", chainParam);
}

async function ethCall(callData: any, blockTag: string = "latest") {
  return await sendToBackground("ETH_CALL", { callData, blockTag });
}

async function getClientVersion() {
  return await sendToBackground("WEB3_CLIENT_VERSION", undefined);
}

async function getCode(address: string, blockTag: string = "latest") {
  return await sendToBackground("ETH_GET_CODE", { address, blockTag });
}

async function getBlockNumber() {
  return await sendToBackground("ETH_GET_BLOCK_NUMBER", undefined);
}

async function getTransactionByHash(hash: string) {
  return await sendToBackground("ETH_GET_TRANSACTION_BY_HASH", { hash });
}
