import React, { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Filter, Search, ChevronLeft, ChevronRight, DollarSign, Calendar, X } from 'lucide-react';
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
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Date filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
  }, [transactions, filter, searchTerm, startDate, endDate]);

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

    // Apply date filter
    if (startDate || endDate) {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Set time to start/end of day for accurate comparison
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && end) {
          return transactionDate >= start && transactionDate <= end;
        } else if (start) {
          return transactionDate >= start;
        } else if (end) {
          return transactionDate <= end;
        }
        return true;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(search) ||
        t.id.toLowerCase().includes(search)
      );
    }

    // Recalculate stats based on filtered data
    calculateStats(filtered);

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleResetFilter = () => {
    setFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
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

        {/* Section Description */}
        <div className="section-description">
          <div className="section-icon">
            <History size={24} />
          </div>
          <div className="section-text">
            <h2 className="section-title">Riwayat Transaksi Modal</h2>
            <p className="section-subtitle">
              Pantau setiap pergerakan modal usaha Anda. Gunakan filter tanggal untuk analisis periode tertentu dan lihat ringkasan transaksi secara real-time.
            </p>
          </div>
        </div>

        {/* Compact Filter Container */}
        <div className="compact-filter-container">
          <div className="filter-row-first">
            <div className="filter-group">
              <Filter size={16} />
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
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan deskripsi atau ID..."
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-row-second">
            <div className="date-group-labeled">
              <label className="date-label-outside">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input-field"
              />
            </div>

            <div className="date-group-labeled">
              <label className="date-label-outside">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input-field"
              />
            </div>

            {(startDate || endDate || filter !== 'all' || searchTerm) && (
              <button onClick={handleResetFilter} className="reset-filter-btn">
                <X size={14} />
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        {/* Filter Results Summary */}
        {(startDate || endDate || filter !== 'all' || searchTerm) && (
          <div className="filter-results-summary">
            <div className="filter-results-header">
              <div className="results-badge">
                <Filter size={12} />
                <span>{filteredTransactions.length} Transaksi Ditemukan</span>
              </div>
            </div>
            <div className="filter-results-stats">
              <div className="result-stat-card stat-income-card">
                <div className="result-stat-icon">
                  <TrendingUp size={20} />
                </div>
                <div className="result-stat-info">
                  <span className="result-stat-label">Total Pemasukan</span>
                  <span className="result-stat-value">{formatCurrency(stats.totalAdd)}</span>
                </div>
              </div>
              <div className="result-stat-card stat-expense-card">
                <div className="result-stat-icon">
                  <TrendingDown size={20} />
                </div>
                <div className="result-stat-info">
                  <span className="result-stat-label">Total Pengeluaran</span>
                  <span className="result-stat-value">{formatCurrency(stats.totalSubtract)}</span>
                </div>
              </div>
              <div className="result-stat-card stat-net-card">
                <div className="result-stat-icon">
                  <DollarSign size={20} />
                </div>
                <div className="result-stat-info">
                  <span className="result-stat-label">Selisih Bersih</span>
                  <span className={`result-stat-value ${stats.netChange >= 0 ? 'positive' : 'negative'}`}>
                    {stats.netChange >= 0 ? '+' : ''}{formatCurrency(stats.netChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div className="pagination-wrapper">
                <div className="pagination-info-top">
                  <span className="pagination-text">
                    Menampilkan {Math.min(startIndex + 1, filteredTransactions.length)} - {Math.min(endIndex, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
                  </span>
                </div>

                <div className="pagination-controls-container">
                  <div className="per-page-selector">
                    <label>Tampilkan:</label>
                    <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(e.target.value)} className="per-page-dropdown">
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                    </select>
                    <span>per halaman</span>
                  </div>

                  <div className="pagination-buttons-group">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pagination-nav-btn"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {/* Smart Pagination */}
                    {(() => {
                      const pages = [];
                      const showPages = 5; // Show max 5 page buttons

                      if (totalPages <= showPages) {
                        // Show all pages if total is small
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Smart pagination logic
                        if (currentPage <= 3) {
                          // Near start
                          pages.push(1, 2, 3, 4, '...', totalPages);
                        } else if (currentPage >= totalPages - 2) {
                          // Near end
                          pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                        } else {
                          // Middle
                          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                        }
                      }

                      return pages.map((page, index) => {
                        if (page === '...') {
                          return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`pagination-page-btn ${currentPage === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      });
                    })()}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-nav-btn"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
