import React from 'react';
import { Bell, User, Clock, Menu } from 'lucide-react';
import './Header.css';

export default function Header({ currentPage, onMenuClick, sidebarOpen }) {
  const getPageTitle = (page) => {
    const titles = {
      dashboard: 'Dashboard',
      inventory: 'Inventory Motor',
      reports: 'Laporan Keuangan',
      transactions: 'Riwayat Transaksi',
    };
    return titles[page] || 'Dashboard';
  };

  const getCurrentDate = () => {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
  };

  return (
    <div className="header">
      <div className="header-wrapper">
        {/* Left Section */}
        <div className="header-left-section">
          <button className="header-menu-btn" onClick={onMenuClick} title="Toggle Menu">
            <Menu size={24} />
          </button>
          <div className="header-title-group">
            <h1 className="header-page-title">{getPageTitle(currentPage)}</h1>
            <div className="header-divider"></div>
            <div className="header-date-info">
              <Clock size={14} />
              <span>{getCurrentDate()}</span>
            </div>
          </div>
        </div>

        {/* Center Section - Branding */}
        <div className="header-center-section">
          <div className="header-brand">
            <span className="header-brand-name">Cupet Motor</span>
            <span className="header-brand-separator">|</span>
            <span className="header-brand-subtitle">Dealer Management System</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="header-right-section">
          {/* Notifications */}
          <button className="header-notification-btn" title="Notifications">
            <Bell size={20} />
            <span className="header-notification-badge">1</span>
          </button>

          {/* Divider */}
          <div className="header-divider-vertical"></div>

          {/* User Profile */}
          <div className="header-user-profile">
            <div className="header-profile-info">
              <p className="header-profile-name">Admin</p>
              <p className="header-profile-role">Manager</p>
            </div>
            <div className="header-profile-avatar-large">
              <User size={18} color="white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
