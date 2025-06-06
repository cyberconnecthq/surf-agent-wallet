import { useEffect, useState } from "react";
import { WalletService } from "../services/walletService";
import "./App.css";
import { WalletDashboard } from "./components/WalletDashboard";

type AppState = "loading" | "ready";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const walletService = WalletService.getInstance();

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      // 首先尝试自动加载钱包（无密码模式）
      const autoLoaded = await walletService.loadWalletAuto();

      if (autoLoaded) {
        console.log("Wallet auto-loaded successfully");
        setAppState("ready");
        return;
      }

      // 如果自动加载失败，检查是否有钱包
      const hasWallet = await walletService.hasWallet();

      if (!hasWallet) {
        // 如果没有钱包，自动创建一个
        console.log("No wallet found, creating automatically...");
        await walletService.createWalletAuto();
        console.log("Wallet created automatically");
      }

      setAppState("ready");
    } catch (error) {
      console.error("Error initializing wallet:", error);
      // 即使出错也显示界面，让用户看到错误信息
      setAppState("ready");
    }
  };

  const handleLock = () => {
    // 在无密码模式下，锁定实际上就是刷新应用
    walletService.lockWallet();
    setAppState("loading");
    // 重新初始化
    setTimeout(() => {
      initializeWallet();
    }, 100);
  };

  const renderContent = () => {
    switch (appState) {
      case "loading":
        return (
          <div className="loading-screen">
            <div className="loading-spinner">🔄</div>
            <p>Loading wallet...</p>
          </div>
        );

      case "ready":
        return <WalletDashboard onLock={handleLock} />;

      default:
        return <div>Unknown state</div>;
    }
  };

  return <div className="app">{renderContent()}</div>;
}

export default App;
