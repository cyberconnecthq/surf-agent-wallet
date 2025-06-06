import { useEffect, useState } from "react";
import { sendToBackground } from "../../utils/messaging";
import "./App.css";
import { WalletDashboard } from "./components/WalletDashboard";

type AppState = "loading" | "ready";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      console.log("🔧 Popup: Initializing wallet...");

      // 从background获取钱包状态
      const walletState = await sendToBackground("GET_WALLET_STATE", undefined);
      console.log("🔧 Popup: Got wallet state from background:", walletState);

      if (walletState.accounts && walletState.accounts.length > 0) {
        console.log("✅ Popup: Wallet is ready");
        setAppState("ready");
        setRetryCount(0); // 重置重试计数
        return;
      }

      // 检查是否有钱包存在
      const hasWallet = await sendToBackground("HAS_WALLET", undefined);
      console.log("🔧 Popup: Has wallet:", hasWallet);

      if (!hasWallet) {
        console.log("⚠️ Popup: No wallet found, background should create one");

        // 限制重试次数，避免无限循环
        if (retryCount < 5) {
          console.log(`🔧 Popup: Retrying... (${retryCount + 1}/5)`);
          setRetryCount((prev) => prev + 1);

          // 增加重试间隔，减少频率
          const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000); // 指数退避，最长10秒
          setTimeout(() => {
            initializeWallet();
          }, retryDelay);
          return;
        } else {
          console.warn(
            "❌ Popup: Max retries reached, showing interface anyway"
          );
          setAppState("ready");
          return;
        }
      }

      console.log("✅ Popup: Wallet exists, ready to use");
      setAppState("ready");
      setRetryCount(0); // 重置重试计数
    } catch (error) {
      console.error("❌ Popup: Error initializing wallet:", error);

      // 如果是网络错误或临时错误，可以重试
      if (retryCount < 3) {
        console.log(
          `🔧 Popup: Error occurred, retrying... (${retryCount + 1}/3)`
        );
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          initializeWallet();
        }, 3000);
        return;
      }

      // 达到最大重试次数，显示界面
      setAppState("ready");
    }
  };

  const handleLock = () => {
    // 在无密码模式下，锁定实际上就是刷新应用
    setAppState("loading");
    setRetryCount(0); // 重置重试计数
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
            <p>Loading wallet from background...</p>
            {retryCount > 0 && (
              <p style={{ fontSize: "12px", color: "#666" }}>
                Retry {retryCount}/5
              </p>
            )}
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
