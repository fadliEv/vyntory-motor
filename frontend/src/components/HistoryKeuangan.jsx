import React, { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Filter, Search, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { GetCapitalTransactions } from '../../wailsjs/go/main/App';
import './HistoryKeuangan.css';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TRANSACTION_TYPES = [
  { value: 'all', label: 'Semua Transaksi' },
  { value: 'add', label: 'Penambahan' },
  { value: 'subtract', label: 'Pengurangan' },
  { value: 'motor_purchase', label: 'Pembelian Motor' },
];

const REFERENCE_TYPE_LABELS = {
  'motor_purchase': 'Pembelian Motor',
  'manual_add': 'Penambahan Manual',
  'manual_subtract': 'Pengurangan Manual',
};

export default function HistoryKeuangan() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Statistics
  const [stats, setStats] = useState({
    totalAdd: 0,
    totalSubtract: 0,
    netChange: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filter, searchTerm]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await GetCapitalTransactions();
      if (response.success) {
        setTransactions(response.data || []);
        calculateStats(response.data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const totalAdd = data
      .filter(t => t.transaction_type === 'add')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSubtract = data
      .filter(t => t.transaction_type === 'subtract')
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalAdd,
      totalSubtract,
      netChange: totalAdd - totalSubtract,
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply type filter
    if (filter !== 'all') {
      if (filter === 'motor_purchase') {
        filtered = filtered.filter(t => t.reference_type === 'motor_purchase');
      } else {
        filtered = filtered.filter(t => t.transaction_type === filter);
      }
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="history-loading">
        <div className="spinner"></div>
        <p>Memuat history transaksi...</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      {/* Header */}
      <div className="history-header">
        <div className="history-header-content">
          <div className="history-title-section">
            <History size={32} color="#F4991A" />
            <div>
              <h1 className="history-title">History Keuangan</h1>
              <p className="history-subtitle">Riwayat semua transaksi modal usaha</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="history-content">
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-add">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Total Penambahan</span>
              <span className="stat-value">{formatCurrency(stats.totalAdd)}</span>
            </div>
          </div>

          <div className="stat-card stat-subtract">
            <div className="stat-icon">
              <TrendingDown size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Total Pengurangan</span>
              <span className="stat-value">{formatCurrency(stats.totalSubtract)}</span>
            </div>
          </div>

          <div className="stat-card stat-net">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-details">
              <span className="stat-label">Perubahan Bersih</span>
              <span className={`stat-value ${stats.netChange >= 0 ? 'positive' : 'negative'}`}>
                {stats.netChange >= 0 ? '+' : ''}{formatCurrency(stats.netChange)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="filter-group">
            <Filter size={18} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              {TRANSACTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="search-group">
            <Search size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan deskripsi atau ID..."
              className="search-input"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="table-container">
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <History size={64} color="#9ca3af" />
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <>
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>ID Transaksi</th>
                    <th>Tanggal & Waktu</th>
                    <th>Jenis</th>
                    <th>Deskripsi</th>
                    <th className="text-right">Jumlah</th>
                    <th className="text-right">Saldo Sebelum</th>
                    <th className="text-right">Saldo Sesudah</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <span className="transaction-id">{transaction.id}</span>
                      </td>
                      <td>
                        <span className="transaction-date">{formatDateTime(transaction.created_at)}</span>
                      </td>
                      <td>
                        <span className={`type-badge type-${transaction.transaction_type}`}>
                          {transaction.transaction_type === 'add' ? (
                            <>
                              <TrendingUp size={14} />
                              <span>{REFERENCE_TYPE_LABELS[transaction.reference_type] || 'Penambahan'}</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown size={14} />
                              <span>{REFERENCE_TYPE_LABELS[transaction.reference_type] || 'Pengurangan'}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="transaction-description">{transaction.description}</span>
                      </td>
                      <td className="text-right">
                        <span className={`amount ${transaction.transaction_type === 'add' ? 'amount-positive' : 'amount-negative'}`}>
                          {transaction.transaction_type === 'add' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="balance">{formatCurrency(transaction.balance_before)}</span>
                      </td>
                      <td className="text-right">
                        <span className="balance">{formatCurrency(transaction.balance_after)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>

                  <div className="pagination-info">
                    <span>
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <span className="pagination-count">
                      Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
                    </span>
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
