import React, { useState } from 'react';
import { ShoppingCart, History } from 'lucide-react';
import TransactionCreate from './TransactionCreate';
import TransactionHistory from './TransactionHistory';
import './TransactionCreate.css';

export default function Transaksi() {
  const [activeTab, setActiveTab] = useState('create');

  const handleNavigateToHistory = () => {
    setActiveTab('history');
  };

  const handleNavigateToCreate = () => {
    setActiveTab('create');
  };

  return (
    <div className="transaksi-container">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={handleNavigateToCreate}
        >
          <ShoppingCart size={20} />
          <span>Buat Transaksi</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={handleNavigateToHistory}
        >
          <History size={20} />
          <span>History</span>
        </button>
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'create' && (
          <TransactionCreate
            onNavigateToHistory={handleNavigateToHistory}
            onBack={handleNavigateToCreate}
          />
        )}
        {activeTab === 'history' && (
          <TransactionHistory
            onBack={handleNavigateToCreate}
          />
        )}
      </div>
    </div>
  );
}
