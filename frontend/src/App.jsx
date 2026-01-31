import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import DataModal from './components/DataModal';
import HistoryKeuangan from './components/HistoryKeuangan';
import TransactionCreate from './components/TransactionCreate';
import TransactionHistory from './components/TransactionHistory';


function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [wailsReady, setWailsReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Wait for Wails runtime to be ready
    const checkWails = () => {
      if (window.go && window.go.main) {
        setWailsReady(true);
      } else {
        setTimeout(checkWails, 100);
      }
    };
    checkWails();
  }, []);

  const renderPage = () => {
    if (!wailsReady) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading application...</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'data-modal':
        return <DataModal />;
      case 'history-keuangan':
        return <HistoryKeuangan />;
      case 'reports':
        return <Reports />;
      case 'buat-transaksi':
        return <TransactionCreate />;
      case 'history-transaksi':
        return <TransactionHistory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <Header
          currentPage={currentPage}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        <main className="app-content">
          {renderPage()}
        </main>
      </div>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

export default App;
