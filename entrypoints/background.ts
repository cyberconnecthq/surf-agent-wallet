import { WalletService } from "./services/walletService";

export default defineBackground(() => {
  console.log("Wallet Extension background script loaded");

  // Handle installation - 自动生成钱包
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("Wallet Extension installed");

    if (details.reason === "install") {
      console.log("First time installation, creating wallet automatically...");

      try {
        const walletService = WalletService.getInstance();

        // 检查是否已经有钱包
        const hasWallet = await walletService.hasWallet();

        if (!hasWallet) {
          // 自动生成钱包（无密码）
          await walletService.createWalletAuto();
          console.log("Wallet created automatically on installation");
        }
      } catch (error) {
        console.error("Failed to create wallet on installation:", error);
      }
    }
  });

  // Handle external requests (from websites)
  browser.runtime.onMessageExternal.addListener(
    (request: any, sender: any, sendResponse: any) => {
      console.log("External message received:", request);

      // Handle wallet connection requests from websites
      if (request.method === "eth_requestAccounts") {
        // This would typically open a popup for user approval
        // For now, we'll just log it
        console.log("Website requesting account access:", sender.tab?.url);
      }

      return true;
    }
  );

  // Handle internal messages
  browser.runtime.onMessage.addListener(
    (request: any, sender: any, sendResponse: any) => {
      console.log("Internal message received:", request);
      return true;
    }
  );
});
