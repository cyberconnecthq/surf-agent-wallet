<!-- @format -->

# 🔐 私钥存储服务 (KeyStore)

精简版的安全私钥存储解决方案，专注于加密存取私钥的核心功能。

## 📋 功能特性

- 🔒 **密码保护**: 使用用户设置的密码加密私钥
- 💾 **安全存储**: 使用 AES-GCM 加密算法保护数据
- 🔑 **简单 API**: 只包含存储和读取私钥的核心功能
- 📦 **数据迁移**: 从旧存储格式无缝迁移

## 🚀 快速开始

### 1. 基本使用

```typescript
import { KeyStoreService } from "./KeyStoreService";
import { generateAndStoreWallet } from "./generateAPIKey";

// 获取KeyStore实例
const keyStore = KeyStoreService.getInstance();

// 生成新钱包并存储私钥
const walletInfo = await generateAndStoreWallet("your-secure-password");
console.log("新钱包地址:", walletInfo.address);
```

### 2. 存储和读取私钥

```typescript
// 存储已有私钥
await keyStore.storePrivateKey("your-private-key-hex", "your-password");

// 读取私钥
const privateKey = await keyStore.getPrivateKey("your-password");
if (privateKey) {
  // 使用私钥进行签名操作...
}
```

### 3. 检查和验证

```typescript
// 检查是否已存储私钥
const hasKey = await keyStore.hasStoredPrivateKey();

// 验证密码
const isValid = await keyStore.verifyPassword("your-password");
```

## 📚 API 文档

### KeyStoreService

| 方法                                    | 描述           | 参数                                   | 返回值                    |
| --------------------------------------- | -------------- | -------------------------------------- | ------------------------- |
| `storePrivateKey(privateKey, password)` | 存储加密私钥   | `privateKey: string, password: string` | `Promise<void>`           |
| `getPrivateKey(password)`               | 获取私钥       | `password: string`                     | `Promise<string \| null>` |
| `hasStoredPrivateKey()`                 | 检查是否已存储 | -                                      | `Promise<boolean>`        |
| `verifyPassword(password)`              | 验证密码       | `password: string`                     | `Promise<boolean>`        |
| `clearStoredData()`                     | 清除存储数据   | -                                      | `Promise<void>`           |

### 工具函数

| 函数                               | 描述             | 参数               | 返回值                    |
| ---------------------------------- | ---------------- | ------------------ | ------------------------- |
| `generateAndStoreWallet(password)` | 生成并存储新钱包 | `password: string` | 钱包信息                  |
| `getStoredPrivateKey(password)`    | 获取存储的私钥   | `password: string` | `Promise<string \| null>` |
| `hasStoredPrivateKey()`            | 检查存储状态     | -                  | `Promise<boolean>`        |
| `verifyStoredPassword(password)`   | 验证密码         | `password: string` | `Promise<boolean>`        |
| `migrateOldStorage(password)`      | 迁移旧存储数据   | `password: string` | `Promise<boolean>`        |

## 🔄 从旧版本迁移

如果你之前使用`browser.storage.local`直接存储私钥，可以使用迁移功能：

```typescript
import { migrateOldStorage } from "./generateAPIKey";

// 迁移旧数据到新的加密存储
const migrated = await migrateOldStorage("your-new-password");
if (migrated) {
  console.log("数据迁移成功");
}
```

## 🛡️ 安全最佳实践

### 密码安全

- ✅ 使用强密码（至少 12 个字符）
- ✅ 包含大小写字母、数字和特殊字符
- ✅ 定期更换密码
- ❌ 不要使用容易猜测的密码

### 私钥安全

- ✅ 私钥已自动加密存储
- ✅ 使用完私钥后立即清除内存
- ❌ 永远不要在控制台打印私钥
- ❌ 不要通过网络传输未加密的私钥

### 存储安全

- ✅ 定期备份加密数据
- ✅ 监控异常的存储访问行为
- ✅ 在生产环境考虑硬件安全模块

## 💡 使用示例

查看 `SimpleKeyStoreExample.ts` 文件获取完整的使用示例和演示代码。

```typescript
import { SimpleWalletManager, runSimpleExample } from "./SimpleKeyStoreExample";

// 运行完整示例
await runSimpleExample();

// 或使用SimpleWalletManager类
const manager = new SimpleWalletManager();
await manager.completeExample();
```

## 🏗️ 技术实现

- **加密算法**: AES-GCM 256 位加密
- **密钥派生**: PBKDF2 (100,000 次迭代)
- **存储后端**: Chrome Extension Storage API / LocalStorage (开发环境)
- **类型安全**: 完整的 TypeScript 类型定义

## ⚠️ 注意事项

1. **密码遗忘**: 如果忘记密码，无法恢复私钥数据
2. **数据备份**: 建议定期备份加密数据
3. **浏览器兼容**: 需要支持 Web Crypto API 的现代浏览器
4. **扩展权限**: 需要`storage`权限来访问 Extension Storage

## 🐛 故障排除

### 常见问题

**Q: 提示"密码错误"**
A: 检查密码是否正确，注意大小写

**Q: 无法获取私钥**
A: 确保已存储私钥且密码正确

**Q: 存储失败**
A: 检查浏览器是否支持 Web Crypto API 和 Extension Storage

**Q: 迁移失败**
A: 确保旧存储中存在`PRIVATE_KEY`数据

## 🔧 简单集成示例

```typescript
import { KeyStoreService } from "./KeyStoreService";

class MyWalletApp {
  private keyStore = KeyStoreService.getInstance();

  async setupWallet(password: string) {
    // 生成新钱包
    const wallet = await generateAndStoreWallet(password);
    return wallet.address;
  }

  async signTransaction(password: string, transactionData: any) {
    // 获取私钥
    const privateKey = await this.keyStore.getPrivateKey(password);

    if (!privateKey) {
      throw new Error("密码错误或未找到私钥");
    }

    // 使用私钥签名
    // ... 签名逻辑
  }
}
```

---

> 💡 **提示**: 这是一个精简版的加密存储解决方案，专注于私钥的安全存取。适合需要简单可靠的私钥管理功能的应用。
