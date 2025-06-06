import React, { useEffect, useState } from "react";
import {
  FiCopy,
  FiDownload,
  FiLock,
  FiRefreshCw,
  FiSend,
} from "react-icons/fi";
import { WalletService } from "../../services/walletService";
import { Network, NETWORKS, WalletAccount } from "../../types/wallet";

interface WalletDashboardProps {
  onLock: () => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({ onLock }) => {
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

  const walletService = WalletService.getInstance();

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    const account = walletService.getCurrentAccount();
    if (account) {
      setCurrentAccount(account);
      await refreshBalance(account.address);
    }

    const state = walletService.getWalletState();
    setCurrentNetwork(state.currentNetwork);
  };

  const refreshBalance = async (address: string) => {
    setIsLoading(true);
    try {
      const newBalance = await walletService.getBalance(address);
      setBalance(newBalance);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
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
    if (!sendForm.to || !sendForm.amount) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      const hash = await walletService.sendTransaction(
        sendForm.to,
        sendForm.amount
      );
      alert(`Transaction sent! Hash: ${hash}`);
      setSendForm({ to: "", amount: "" });
      setActiveTab("activity");
      if (currentAccount) {
        await refreshBalance(currentAccount.address);
      }
    } catch (error) {
      alert(`Transaction failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchNetwork = (network: Network) => {
    walletService.switchNetwork(network.chainId);
    setCurrentNetwork(network);
    setShowNetworkSelector(false);
    if (currentAccount) {
      refreshBalance(currentAccount.address);
    }
  };

  if (!currentAccount) {
    return <div>Loading...</div>;
  }

  return (
    <div className="wallet-dashboard">
      <div className="floating-particles"></div>

      <div className="send-tab">
        <div className="send-form">
          <div className="form-group">
            <label>To Address</label>
            <input
              type="text"
              value={sendForm.to}
              onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label>Amount ({currentNetwork.currency})</label>
            <input
              type="number"
              step="0.001"
              value={sendForm.amount}
              onChange={(e) =>
                setSendForm({ ...sendForm, amount: e.target.value })
              }
              placeholder="0.0"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={isLoading || !sendForm.to || !sendForm.amount}
          >
            {isLoading ? "Sending..." : "🚀 Send Transaction"}
          </button>
        </div>
      </div>
      {/* Header */}
      <div className="wallet-header">
        <div className="network-selector">
          <button
            className="network-btn"
            onClick={() => setShowNetworkSelector(!showNetworkSelector)}
          >
            {currentNetwork.name}
            <span className="dropdown-arrow">▼</span>
          </button>

          {showNetworkSelector && (
            <div className="network-dropdown">
              {NETWORKS.map((network) => (
                <button
                  key={network.chainId}
                  className={`network-option ${
                    network.chainId === currentNetwork.chainId ? "active" : ""
                  }`}
                  onClick={() => switchNetwork(network)}
                >
                  {network.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="lock-btn" onClick={onLock}>
          <FiLock />
        </button>
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
      <div className="tab-navigation">
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
                <div className="asset-symbol">{currentNetwork.currency}</div>
                <div className="asset-name">{currentNetwork.name}</div>
              </div>
              <div className="asset-balance">
                {parseFloat(balance).toFixed(4)}
              </div>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="activity-tab">
            <div className="no-activity">
              <p>✨ No recent activity</p>
            </div>
          </div>
        )}

        {activeTab === "send" && (
          <div className="send-tab">
            <div className="send-form">
              <div className="form-group">
                <label>To Address</label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, to: e.target.value })
                  }
                  placeholder="0x..."
                />
              </div>

              <div className="form-group">
                <label>Amount ({currentNetwork.currency})</label>
                <input
                  type="number"
                  step="0.001"
                  value={sendForm.amount}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, amount: e.target.value })
                  }
                  placeholder="0.0"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={isLoading || !sendForm.to || !sendForm.amount}
              >
                {isLoading ? "Sending..." : "🚀 Send Transaction"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "receive" && (
          <div className="receive-tab">
            <div className="receive-form">
              <div className="receive-header">
                <h3>Receive {currentNetwork.currency}</h3>
                <p>Send {currentNetwork.currency} to this address</p>
              </div>

              <div className="address-display">
                <div className="address-qr">
                  <div className="qr-placeholder">
                    📱
                    <p>QR Code</p>
                  </div>
                </div>

                <div className="address-text">
                  <label>Your Address</label>
                  <div className="address-container">
                    <input
                      type="text"
                      value={currentAccount.address}
                      readOnly
                      className="address-input"
                    />
                    <button
                      className="copy-btn"
                      onClick={copyAddress}
                      title="Copy Address"
                    >
                      <FiCopy />
                    </button>
                  </div>
                </div>
              </div>

              <div className="receive-warning">
                <p>
                  ⚠️ Only send {currentNetwork.currency} and{" "}
                  {currentNetwork.name} compatible tokens to this address
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
