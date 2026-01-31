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
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';


function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [wailsReady, setWailsReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authPage, setAuthPage] = useState('login'); // 'login', 'register', 'forgot-password'

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

    // Check authentication from localStorage
    const sessionToken = localStorage.getItem('sessionToken');
    const storedUser = localStorage.getItem('user');

    if (sessionToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
      }
    }

    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

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

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #344F1F 0%, #5a7a3c 100%)',
        color: '#ffffff'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main app if authenticated
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
