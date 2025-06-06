import { sendToBackground } from "../utils/messaging";

export default defineContentScript({
  matches: ["<all_urls>"],
  world: "ISOLATED",
  main() {
    // 在 ISOLATED world 中处理与 background 的通信
    setupIsolatedWorldHandler();
  },
});

function setupIsolatedWorldHandler() {
  // 监听来自 MAIN world 的消息
  window.addEventListener("message", async (event) => {
    if (
      event.source !== window ||
      event.data.type !== "WALLET_REQUEST_TO_BACKGROUND"
    ) {
      return;
    }

    const { method, params, messageId } = event.data;

    console.log(
      "🚀 ~ window.addEventListener ~  method, params, messageId :",
      method,
      params,
      messageId
    );

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
      window.postMessage(
        {
          type: "WALLET_RESPONSE_FROM_BACKGROUND",
          messageId,
          error: (error as Error).message,
        },
        "*"
      );
    }
  });
}

// 处理钱包请求（在 ISOLATED world 中运行）
async function handleWalletRequest(method: string, params: any[] = []) {
  switch (method) {
    case "eth_requestAccounts":
      return await requestAccounts();

    case "eth_accounts":
      return await getAccounts();

    case "eth_chainId":
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
  await sendToBackground("SWITCH_CHAIN", { chainId });

  // 触发链变更事件
  window.postMessage(
    {
      type: "WALLET_EVENT",
      event: "chainChanged",
      data: chainParam.chainId,
    },
    "*"
  );

  return null;
}

async function addChain(chainParam: any) {
  return await sendToBackground("ADD_CHAIN", chainParam);
}
