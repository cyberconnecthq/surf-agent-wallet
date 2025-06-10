import React, { useEffect, useState } from "react";
import {
  FiChevronDown,
  FiCopy,
  FiDownload,
  FiRefreshCw,
  FiSend
} from "react-icons/fi";
import { sendToBackground } from "../../../utils/messaging";
import { Network, NETWORKS, WalletAccount } from "../../types/wallet";
import "./WalletDashboard.css";



export const WalletDashboard: React.FC<{}> = ({ }) => {
  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(
    null
  );
  const [balance, setBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "assets" | "activity" | "send" | "receive"
  >("assets");
  const [currentNetwork, setCurrentNetwork] = useState<Network>(NETWORKS[0]);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", amount: "" });

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      // 从background获取当前账户
      const account = await sendToBackground("GET_CURRENT_ACCOUNT", undefined);

      if (account) {
        setCurrentAccount(account);
        await refreshBalance(account.address);
      }

      // 从background获取钱包状态
      const state = await sendToBackground("GET_WALLET_STATE", undefined);

      if (state && state.currentNetwork) {
        setCurrentNetwork(state.currentNetwork);
      }
    } catch (error) {
      console.error("❌ Popup: Failed to load wallet data:", error);
    }
  };

  const refreshBalance = async (address: string) => {
    setIsLoading(true);
    try {
      // 通过background刷新余额
      const newBalance = await sendToBackground("REFRESH_BALANCE", { address });
      setBalance(newBalance);
    } catch (error) {
      console.error("❌ Popup: Failed to fetch balance:", error);
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (currentAccount) {
      navigator.clipboard.writeText(currentAccount.address);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSend = async () => {
    if (!sendForm.to || !sendForm.amount || !currentAccount) {
      alert("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // 通过background发送交易
      const txHash = await sendToBackground("SEND_TRANSACTION_FROM_POPUP", {
        to: sendForm.to,
        amount: sendForm.amount,
      });

      alert(`Transaction sent! Hash: ${txHash}`);
      setSendForm({ to: "", amount: "" });
      setActiveTab("assets");

      // 刷新余额
      await refreshBalance(currentAccount.address);
    } catch (error) {
      console.error("❌ Popup: Transaction failed:", error);
      alert(`Transaction failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="wallet-dashboard">
        <div className="loading-screen">
          <div className="loading-spinner">🔄</div>
          <p>Loading account from background...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-dashboard">
      {/* Header */}
      <div className="wallet-header">
        <div
          className="network-selector"
          onClick={() => setShowNetworkSelector(!showNetworkSelector)}
        >
          <span className="network-name">{currentNetwork.name}</span>
          <FiChevronDown />
          {showNetworkSelector && (
            <div className="network-dropdown">
              {NETWORKS.map((network) => (
                <div
                  key={network.chainId}
                  className={`network-option ${network.chainId === currentNetwork.chainId ? "selected" : ""
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentNetwork(network);
                    setShowNetworkSelector(false);
                  }}
                >
                  {network.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="account-info">
        <div className="account-avatar">
          <div className="avatar-circle">{currentAccount.name.charAt(0)}</div>
        </div>

        <h2 className="account-name">{currentAccount.name}</h2>

        <div className="account-address" onClick={copyAddress}>
          {formatAddress(currentAccount.address)}
          <FiCopy className="copy-icon" />
        </div>

        <div className="balance-section">
          <div className="balance-amount">
            {isLoading ? (
              <div className="loading-spinner">
                <FiRefreshCw className="spin" />
              </div>
            ) : (
              `${parseFloat(balance).toFixed(4)} ${currentNetwork.currency}`
            )}
          </div>

          <button
            className="refresh-btn"
            onClick={() => refreshBalance(currentAccount.address)}
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? "spin" : ""} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="action-btn" onClick={() => setActiveTab("send")}>
            <FiSend />
            Send
          </button>

          <button
            className="action-btn"
            onClick={() => setActiveTab("receive")}
          >
            <FiDownload />
            Receive
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="wallet-tabs">
        <button
          className={`tab ${activeTab === "assets" ? "active" : ""}`}
          onClick={() => setActiveTab("assets")}
        >
          Assets
        </button>
        <button
          className={`tab ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Activity
        </button>
        <button
          className={`tab ${activeTab === "send" ? "active" : ""}`}
          onClick={() => setActiveTab("send")}
        >
          Send
        </button>
        <button
          className={`tab ${activeTab === "receive" ? "active" : ""}`}
          onClick={() => setActiveTab("receive")}
        >
          Receive
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "assets" && (
          <div className="assets-tab">
            <div className="asset-item">
              <div className="asset-info">
                <div className="asset-icon">Ξ</div>
                <div className="asset-details">
                  <div className="asset-name">{currentNetwork.currency}</div>
                  <div className="asset-balance">{balance}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="activity-tab">
            <p className="empty-state">No recent activity</p>
          </div>
        )}

        {activeTab === "send" && (
          <div className="send-tab">
            <div className="send-form">
              <div className="form-group">
                <label>To:</label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, to: e.target.value })
                  }
                  placeholder="Recipient address"
                />
              </div>
              <div className="form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, amount: e.target.value })
                  }
                  placeholder="0.0"
                  step="0.001"
                />
              </div>
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={isLoading || !sendForm.to || !sendForm.amount}
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "receive" && (
          <div className="receive-tab">
            <div className="receive-info">
              <div className="qr-placeholder">
                <div className="qr-code">QR Code</div>
              </div>
              <div className="receive-address">
                <label>Your Address:</label>
                <div className="address-display" onClick={copyAddress}>
                  {currentAccount.address}
                  <FiCopy className="copy-icon" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
