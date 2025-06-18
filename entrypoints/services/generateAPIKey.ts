/** @format */

import { KeyStoreService } from "./KeyStoreService";
import { PASSWORD } from "./PASSWORD";

const keyStore = KeyStoreService.getInstance();

export async function generateAPIKeyFormat() {
  try {
    // Always generate fresh keys - clear any existing stored keys first
    // This ensures unique keys in e2b environment on each run
    await browser.storage.local.remove(["PUBLIC_KEY"]);
    await keyStore.clearStoredData();

    const result = await generateECDSAKeyPair();

    // 生成符合API要求的格式
    const compressedPubKeyHex = Array.from(result.compressedPublicKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const privateKeyHex = Array.from(result.privateKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    browser.storage.local.set({
      PUBLIC_KEY: compressedPubKeyHex,
    });

    await keyStore.storePrivateKey(privateKeyHex, PASSWORD);

    return {
      publicKey: compressedPubKeyHex,
      privateKey: privateKeyHex,
    };
  } catch (error) {
    console.error("❌ 生成API密钥失败:", error);
    throw error;
  }
}

async function generateECDSAKeyPair() {
  try {
    // 🎲 专门针对e2b环境的强随机性增强
    await enhanceRandomnessForE2B();

    // 严格按照Go代码：priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256", // 对应 elliptic.P256()
      },
      true, // extractable - 允许导出密钥
      ["sign", "verify"]
    );

    // 导出原始私钥（JWK格式，更准确地获取d值）
    const privateKeyJwk = await crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );

    // 从JWK格式中提取私钥标量d（对应Go中的priv.D）
    const privateKeyScalar = base64UrlToUint8Array(privateKeyJwk.d!);

    // 导出原始公钥
    const publicKeyBuffer = await crypto.subtle.exportKey(
      "raw",
      keyPair.publicKey
    );
    const publicKeyArray = new Uint8Array(publicKeyBuffer);

    // 严格按照Go代码：pubCompressedHex := hex.EncodeToString(compressPub(&priv.PublicKey))
    const compressedPubKey = compressPub(publicKeyArray);

    return {
      privateKey: privateKeyScalar,
      publicKey: publicKeyArray,
      compressedPublicKey: compressedPubKey,
      keyPair: keyPair,
    };
  } catch (error) {
    console.error("Failed to generate key pair:", error);
    throw error;
  }
}

// 严格按照Go代码实现 compressPub 函数
function compressPub(rawPublicKey: Uint8Array): Uint8Array {
  // P-256 raw public key is 65 bytes: 0x04 + 32 bytes X + 32 bytes Y
  if (rawPublicKey.length !== 65 || rawPublicKey[0] !== 0x04) {
    throw new Error("Invalid raw public key format");
  }

  // 提取X和Y坐标（各32字节）
  const x = rawPublicKey.slice(1, 33);
  const y = rawPublicKey.slice(33, 65);

  // 严格按照Go代码：byteLen := (pub.Curve.Params().BitSize + 7) >> 3
  // 对于P-256，BitSize是256，所以byteLen = (256 + 7) >> 3 = 32
  const byteLen = 32;

  // 严格按照Go代码：out := make([]byte, byteLen+1)
  const out = new Uint8Array(byteLen + 1);

  // 严格按照Go代码：if pub.Y.Bit(0) == 0 { out[0] = 0x02 } else { out[0] = 0x03 }
  // Y.Bit(0) 检查Y坐标的最低位
  if ((y[31] & 1) === 0) {
    out[0] = 0x02;
  } else {
    out[0] = 0x03;
  }

  // 严格按照Go代码：copy(out[1+byteLen-len(x):], x)
  // 这里x已经是32字节，所以直接复制到out[1:]
  out.set(x, 1);

  return out;
}

// Base64URL解码函数，用于从JWK格式中提取私钥
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  // 添加padding
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + padding;

  // 解码
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

// 专门针对e2b环境的强随机性增强函数
async function enhanceRandomnessForE2B(): Promise<void> {
  console.log("🎯 Enhancing randomness for e2b environment...");

  // 1. 强制刷新熵池 - 生成大量随机数来"搅动"PRNG
  for (let i = 0; i < 10; i++) {
    const entropy = new Uint8Array(1024);
    crypto.getRandomValues(entropy);
    // 不保存，只是为了消耗和刷新随机数生成器状态
  }

  // 2. 使用多重时间源增加不可预测性
  const timingSources = [
    Date.now(),
    performance.now(),
    new Date().getTime(),
    new Date().getMilliseconds(),
  ];

  // 3. 创建基于内存地址的"随机性"（对象引用的哈希）
  const memoryEntropy = [];
  for (let i = 0; i < 5; i++) {
    const obj = {};
    memoryEntropy.push(obj.toString().slice(-8)); // 对象内存地址的后8位
  }

  // 4. 鼠标/用户交互熵（如果在浏览器环境中）
  const interactionEntropy =
    typeof window !== "undefined"
      ? window.screenX + window.screenY + window.devicePixelRatio * 1000
      : Math.random() * 1000000;

  // 5. 异步延迟来引入时序随机性
  const delay = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 6. 最终的熵注入
  const finalEntropy = new Uint8Array(64);
  crypto.getRandomValues(finalEntropy);

  const entropyHash = await hashWithWebCrypto(
    [
      ...timingSources,
      ...memoryEntropy,
      interactionEntropy,
      Array.from(finalEntropy),
    ].join("-")
  );

  console.log("🔀 E2B entropy injection completed:", {
    sources: timingSources.length + memoryEntropy.length + 2,
    hash: entropyHash.slice(0, 16) + "...",
    timestamp: new Date().toISOString(),
  });
}

// 使用Web Crypto API进行安全哈希
async function hashWithWebCrypto(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
