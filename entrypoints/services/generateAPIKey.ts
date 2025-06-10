export async function generateAPIKeyFormat() {
  try {
    const result = await generateECDSAKeyPair();

    // 生成符合API要求的格式
    const compressedPubKeyHex = Array.from(result.compressedPublicKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const privateKeyHex = Array.from(result.privateKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

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
