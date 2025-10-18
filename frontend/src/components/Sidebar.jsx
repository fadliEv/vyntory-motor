import React, { useState } from 'react';
import { BarChart3, Package, FileText, Settings, Home, LogOut, TrendingUp, DollarSign, ChevronDown, ChevronUp, History, Wallet } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, onClose }) {
  const [expandedMenus, setExpandedMenus] = useState({ keuangan: true }); // Keuangan menu expanded by default

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory Motor', icon: Package },
    {
      id: 'keuangan',
      label: 'Keuangan',
      icon: DollarSign,
      isExpandable: true,
      subItems: [
        { id: 'data-modal', label: 'Data Modal', icon: Wallet },
        { id: 'history-keuangan', label: 'History Keuangan', icon: History },
        { id: 'reports', label: 'Laporan Keuangan', icon: FileText },
      ]
    },
    { id: 'transactions', label: 'Transaksi', icon: TrendingUp },
  ];

  const handleMenuClick = (pageId, isExpandable) => {
    if (isExpandable) {
      // Toggle expand/collapse for expandable menus
      setExpandedMenus(prev => ({
        ...prev,
        [pageId]: !prev[pageId]
      }));
    } else {
      setCurrentPage(pageId);
      onClose();
    }
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
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id} className="sidebar-menu-group">
                <button
                  onClick={() => handleMenuClick(item.id, item.isExpandable)}
                  className={`sidebar-menu-item ${isActive ? 'active' : ''} ${item.isExpandable ? 'expandable' : ''}`}
                >
                  <div className="sidebar-menu-item-content">
                    <IconComponent size={20} />
                    <span>{item.label}</span>
                  </div>
                  {item.isExpandable && (
                    <div className="sidebar-menu-chevron">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </button>

                {/* Render submenu if expandable and expanded */}
                {item.isExpandable && isExpanded && item.subItems && (
                  <div className="sidebar-submenu">
                    {item.subItems.map((subItem) => {
                      const SubIconComponent = subItem.icon;
                      const isSubActive = currentPage === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleMenuClick(subItem.id, false)}
                          className={`sidebar-submenu-item ${isSubActive ? 'active' : ''}`}
                        >
                          <SubIconComponent size={18} />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
