import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Wallet Extension Demo",
    description: "A MetaMask-like wallet browser extension",
    permissions: ["storage", "activeTab"],
    host_permissions: ["*://*/*"],
    externally_connectable: {
      matches: ["*://*/*"],
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  vite: () => ({
    define: {
      global: "globalThis",
      process: JSON.stringify({
        env: {},
        version: "",
        versions: {},
        browser: true,
      }),
    },
    resolve: {
      alias: {
        buffer: "buffer",
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        util: "util",
        path: "path-browserify",
        process: "process/browser",
      },
    },
    optimizeDeps: {
      include: [
        "buffer",
        "crypto-browserify",
        "stream-browserify",
        "util",
        "path-browserify",
        "process/browser",
      ],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }),
});
