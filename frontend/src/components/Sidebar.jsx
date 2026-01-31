import React, { useState } from 'react';
import { BarChart3, Package, FileText, Settings, Home, LogOut, TrendingUp, DollarSign, ChevronDown, ChevronUp, History, Wallet, ShoppingCart } from 'lucide-react';
import { Logout as LogoutAPI } from '../../wailsjs/go/main/App';
import './Sidebar.css';

export default function Sidebar({ currentPage, setCurrentPage, isOpen, onClose }) {
  const [expandedMenus, setExpandedMenus] = useState({ keuangan: true }); // Keuangan menu expanded by default

  // Get user role from localStorage
  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.role;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const userRole = getUserRole();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'inventory', label: 'Inventory Motor', icon: Package },
    {
      id: 'keuangan',
      label: 'Keuangan',
      icon: DollarSign,
      isExpandable: true,
      subItems: [
        { id: 'data-modal', label: 'Data Modal', icon: Wallet, ownerOnly: true }, // Owner only
        { id: 'history-keuangan', label: 'History Keuangan', icon: History, ownerOnly: true }, // Owner only
        { id: 'reports', label: 'Laporan Keuangan', icon: FileText, ownerOnly: true }, // Owner only
      ]
    },
    {
      id: 'transaksi',
      label: 'Transaksi',
      icon: TrendingUp,
      isExpandable: true,
      subItems: [
        { id: 'buat-transaksi', label: 'Buat Transaksi', icon: ShoppingCart },
        { id: 'history-transaksi', label: 'History', icon: History },
      ]
    },
  ];

  // Filter menu items based on user role
  const getFilteredMenuItems = () => {
    if (userRole === 'owner') {
      return menuItems; // Owner sees all menus
    }

    // Karyawan: filter out owner-only items
    return menuItems.map(item => {
      if (item.isExpandable && item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => !subItem.ownerOnly);

        // If all subitems are filtered out, hide the parent menu
        if (filteredSubItems.length === 0) {
          return null;
        }

        return {
          ...item,
          subItems: filteredSubItems
        };
      }
      return item;
    }).filter(item => item !== null);
  };

  const filteredMenuItems = getFilteredMenuItems();

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

  const handleLogout = async () => {
    try {
      // Get session token
      const sessionToken = localStorage.getItem('sessionToken');

      if (sessionToken) {
        // Call real Logout API
        await LogoutAPI(sessionToken);
      }

      // Clear session from localStorage
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');

      // Reload page to redirect to login
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API fails, clear local storage and reload
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      window.location.reload();
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
            <h1>Vyntory Motor</h1>
            <p>Dealer Management</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-menu">
          {filteredMenuItems.map((item) => {
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
        <button className="sidebar-footer-btn logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
