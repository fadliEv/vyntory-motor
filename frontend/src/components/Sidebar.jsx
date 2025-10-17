import React from 'react';
import { BarChart3, Package, FileText, Settings, Home, LogOut, TrendingUp } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, onClose }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory Motor', icon: Package },
    { id: 'reports', label: 'Laporan Keuangan', icon: FileText },
    { id: 'transactions', label: 'Transaksi', icon: TrendingUp },
  ];

  const handleMenuClick = (pageId) => {
    setCurrentPage(pageId);
    onClose();
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Logo/Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo-icon">
            <BarChart3 size={24} color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h1>Cupet Motor</h1>
            <p>Dealer Management</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-footer-btn">
          <Settings size={20} />
          <span>Pengaturan</span>
        </button>
        <button className="sidebar-footer-btn logout">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
