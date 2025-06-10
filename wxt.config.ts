/** @format */

import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    manifest_version: 3,
    name: "Surf Wallet",
    description: "A Surf wallet browser extension",
    permissions: ["storage", "activeTab"],
    host_permissions: ["*://*/*"],
    storage: {
      managed_schema: "managed_storage_schema.json",
    },
    externally_connectable: {
      matches: ["*://*/*"],
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoqej0j7trLVPp+7AqO9fbY/PYjvRTqJ0plbtXW0X712b5ujIHyBz74p3febX1NN6jQ/DjrHf4KSvE9Jos+9CP6dNaHL5pDUteezi4kECWQwoco9zwua79YsLA0Ntp+jqaOh0Xm519jDMP8OWzG/aE6cj4ARui4iNioAx4DHn8yWNhtC3TOkEfY6+RcBGEUjprTz6rwUWGG3udy/FhgbFxhYgrbVDC0/KR74OZ5uihRhQEIw93gOUY97gCpO3q3EXa9T13yMIzlGSsBTvpVJgVQHYiJzJOtvUempFEY49WIqR5a+qhF8DbnTG/KLGFoB0UpiGMjvA7Zq8exutXlK6MQIDAQAB",
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
