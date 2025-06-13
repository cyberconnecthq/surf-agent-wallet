<!-- @format -->

# Surf Wallet

Surf Wallet 是一款浏览器钱包插件，基于 WXT + React 构建。

## 功能特性

- **现代化的技术栈**: 使用 WXT 和 React 构建，提供优秀的开发体验和性能。
- **强大的钱包功能**: 集成 [ethers.js](https://ethers.io/)，支持以太坊及兼容链的各种操作。
- **安全的密钥管理**: 使用 [@turnkey/sdk-browser](https://www.turnkey.com) 进行安全的密钥管理。
- **高度可定制**: 你可以轻松地在此模板的基础上进行二次开发，构建你自己的浏览器钱包。

## 准备工作

在开始之前，请确保你已经安装了以下工具：

- [Node.js](https://nodejs.org/) (版本 18 或更高)
- [pnpm](https://pnpm.io/)

## 安装

1.  克隆项目到本地:

    ```bash
    git clone https://github.com/your-username/surf-agent-wallet.git
    cd surf-wallet
    ```

2.  使用 pnpm 安装依赖:
    ```bash
    pnpm install
    ```

## 开发

执行以下命令以启动开发服务器:

```bash
pnpm dev
```

该命令会启动一个用于开发的浏览器实例，并自动加载插件。WXT 会监听文件变化并自动重新加载插件，为你提供流畅的开发体验。

如果你想为 Firefox 开发，可以执行:

```bash
pnpm dev:firefox
```

## 构建

执行以下命令来构建生产版本的插件:

```bash
pnpm build
```

构建产物会生成在 `.output/surf-wallet` 目录下。

如果你想为 Firefox 构建，可以执行:

```bash
pnpm build:firefox
```

### 打包插件

执行以下命令可以将构建好的插件打包为 `.zip` 文件，方便分发:

```bash
pnpm zip
```

打包产物会生成在 `.output` 目录下。

同样地，你也可以为 Firefox 打包:

```bash
pnpm zip:firefox
```

## 项目结构

```
.
├── entrypoints/      # 插件入口点 (popup, background, etc.)
├── public/           # 静态资源
├── styles/           # 样式文件
├── utils/            # 工具函数
├── package.json      # 项目依赖和脚本
├── wxt.config.ts     # WXT 配置文件
└── ...
```

## 主要依赖

- [wxt](https://wxt.dev/): 下一代浏览器插件开发工具
- [React](https://react.dev/): 用于构建用户界面的 JavaScript 库
- [ethers](https://docs.ethers.io/): 完整的以太坊钱包实现和工具库
- [@turnkey/sdk-browser](https://www.turnkey.com/): Turnkey 浏览器端 SDK
- [pnpm](https://pnpm.io/): 快速、节省磁盘空间的包管理器

## 贡献

欢迎提交 issue 或 pull request 来改进项目！

## 开源许可

[MIT](./LICENSE)
