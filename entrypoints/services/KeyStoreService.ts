/** @format */

export class KeyStoreService {
  private static instance: KeyStoreService;
  private readonly PRIVATE_KEY_STORAGE_KEY = "ENCRYPTED_PRIVATE_KEY";
  private readonly PASSWORD_HASH_KEY = "PASSWORD_HASH";

  private constructor() {}

  static getInstance(): KeyStoreService {
    if (!KeyStoreService.instance) {
      KeyStoreService.instance = new KeyStoreService();
    }
    return KeyStoreService.instance;
  }

  /**
   * 设置密码并存储加密的私钥
   */
  async storePrivateKey(privateKey: string, password: string): Promise<void> {
    try {
      // 生成盐值并创建密码hash
      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(password, salt);

      // 加密私钥
      const encryptedPrivateKey = await this.encryptData(
        privateKey,
        password,
        salt
      );

      // 存储加密的私钥和密码hash
      await this.saveToStorage(this.PRIVATE_KEY_STORAGE_KEY, {
        encryptedData: encryptedPrivateKey,
        salt: salt,
      });
      await this.saveToStorage(this.PASSWORD_HASH_KEY, passwordHash);

      console.log("✅ 私钥已加密存储");
    } catch (error) {
      console.error("❌ 存储私钥失败:", error);
      throw error;
    }
  }

  /**
   * 使用密码解密并获取私钥
   */
  async getPrivateKey(password: string): Promise<string | null> {
    try {
      // 验证密码
      const isValid = await this.verifyPassword(password);
      if (!isValid) {
        console.error("❌ 密码错误");
        return null;
      }

      // 获取加密的私钥数据
      const encryptedData = await this.getFromStorage(
        this.PRIVATE_KEY_STORAGE_KEY
      );
      if (!encryptedData) {
        console.error("❌ 未找到存储的私钥");
        return null;
      }

      // 解密私钥
      const privateKey = await this.decryptData(
        encryptedData.encryptedData,
        password,
        encryptedData.salt
      );

      return privateKey;
    } catch (error) {
      console.error("❌ 获取私钥失败:", error);
      return null;
    }
  }

  /**
   * 检查是否已存储私钥
   */
  async hasStoredPrivateKey(): Promise<boolean> {
    const encryptedData = await this.getFromStorage(
      this.PRIVATE_KEY_STORAGE_KEY
    );
    const passwordHash = await this.getFromStorage(this.PASSWORD_HASH_KEY);
    return !!(encryptedData && passwordHash);
  }

  /**
   * 验证密码是否正确
   */
  async verifyPassword(password: string): Promise<boolean> {
    try {
      const storedHash = await this.getFromStorage(this.PASSWORD_HASH_KEY);
      if (!storedHash) {
        return false;
      }

      const encryptedData = await this.getFromStorage(
        this.PRIVATE_KEY_STORAGE_KEY
      );
      if (!encryptedData || !encryptedData.salt) {
        return false;
      }

      const passwordHash = await this.hashPassword(
        password,
        encryptedData.salt
      );
      return passwordHash === storedHash;
    } catch (error) {
      console.error("❌ 验证密码失败:", error);
      return false;
    }
  }

  /**
   * 清除存储的私钥数据
   */
  async clearStoredData(): Promise<void> {
    await this.removeFromStorage(this.PRIVATE_KEY_STORAGE_KEY);
    await this.removeFromStorage(this.PASSWORD_HASH_KEY);
    console.log("🗑️ 私钥数据已清除");
  }

  // 私有方法

  private generateSalt(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  private async encryptData(
    data: string,
    password: string,
    salt: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // 生成随机IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 导入密钥材料
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // 生成加密密钥
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    // 加密数据
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      dataBuffer
    );

    // 合并IV和加密数据
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // 转为hex字符串
    return Array.from(combined, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  private async decryptData(
    encryptedHex: string,
    password: string,
    salt: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 将hex字符串转回Uint8Array
    const encryptedArray = new Uint8Array(
      encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    // 分离IV和加密数据
    const iv = encryptedArray.slice(0, 12);
    const encryptedData = encryptedArray.slice(12);

    // 导入密钥材料
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // 生成解密密钥
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );

    return decoder.decode(decryptedBuffer);
  }

  // 存储工具方法
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
        const value = localStorage.getItem(key);
        resolve(value ? JSON.parse(value) : undefined);
      }
    });
  }

  private async removeFromStorage(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof browser !== "undefined" && browser.storage) {
        browser.storage.local.remove([key], resolve);
      } else if (
        typeof window !== "undefined" &&
        (window as any).chrome?.storage
      ) {
        (window as any).chrome.storage.local.remove([key], resolve);
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  }
}
