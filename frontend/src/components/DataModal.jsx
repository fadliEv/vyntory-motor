import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, TrendingUp, TrendingDown, History, AlertCircle, DollarSign, Info, ShoppingCart, FileText, Shield, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GetCurrentCapital, AddCapital, SubtractCapital, GetCapitalTransactions } from '../../wailsjs/go/main/App';
import { AlertModal, ConfirmModal } from './Modal';
import './DataModal.css';

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

const formatDateOnly = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function DataModal() {
  const [capital, setCapital] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // 'add' or 'subtract'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStats, setFilterStats] = useState({
    totalAdd: 0,
    totalSubtract: 0,
    netChange: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    description: ''
  });

  // Modal states
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allTransactions, startDate, endDate, currentPage, itemsPerPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current capital
      const capitalResponse = await GetCurrentCapital();
      if (capitalResponse.success) {
        setCapital(capitalResponse.data);
      }

      // Load all transactions
      const transactionsResponse = await GetCapitalTransactions();
      if (transactionsResponse.success && transactionsResponse.data) {
        const transactions = Array.isArray(transactionsResponse.data)
          ? transactionsResponse.data
          : [];
        setAllTransactions(transactions);
      } else {
        setAllTransactions([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Gagal memuat data modal: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allTransactions];

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

    // Calculate filter stats
    const totalAdd = filtered
      .filter(t => t.transaction_type === 'add')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSubtract = filtered
      .filter(t => t.transaction_type === 'subtract')
      .reduce((sum, t) => sum + t.amount, 0);

    setFilterStats({
      totalAdd,
      totalSubtract,
      netChange: totalAdd - totalSubtract
    });

    setFilteredTransactions(filtered);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({ amount: '', description: '' });
    setActiveForm(null);
  };

  const handleSubmit = async (type) => {
    // Validation - remove thousand separators before parsing
    const numericAmount = formData.amount.replace(/\./g, '');
    const amount = parseFloat(numericAmount);
    if (!amount || amount <= 0) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Jumlah harus lebih dari 0'
      });
      return;
    }

    if (!formData.description.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Deskripsi harus diisi'
      });
      return;
    }

    // Show confirmation
    const actionText = type === 'add' ? 'menambah' : 'mengurangi';
    setConfirmModal({
      isOpen: true,
      message: `Apakah Anda yakin ingin ${actionText} modal sebesar ${formatCurrency(amount)}?`,
      onConfirm: async () => {
        try {
          const response = type === 'add'
            ? await AddCapital(amount, formData.description)
            : await SubtractCapital(amount, formData.description);

          if (response.success) {
            setAlertModal({
              isOpen: true,
              type: 'success',
              message: response.message
            });
            resetForm();
            loadData(); // Reload data
          } else {
            setAlertModal({
              isOpen: true,
              type: 'error',
              message: response.message
            });
          }
        } catch (error) {
          setAlertModal({
            isOpen: true,
            type: 'error',
            message: 'Terjadi kesalahan: ' + error.message
          });
        }
      }
    });
  };

  const handleAmountChange = (value) => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, '');

    // Format with thousand separators
    if (numericValue === '') {
      setFormData({ ...formData, amount: '' });
      return;
    }

    const formatted = Number(numericValue).toLocaleString('id-ID');
    setFormData({ ...formData, amount: formatted });
  };

  if (loading) {
    return (
      <div className="data-modal-loading">
        <div className="spinner"></div>
        <p>Memuat data modal...</p>
      </div>
    );
  }

  return (
    <div className="data-modal-container">
      {/* Header */}
      <div className="data-modal-header">
        <div className="data-modal-header-content">
          <div className="data-modal-title-section">
            <Wallet size={32} color="#F4991A" />
            <div>
              <h1 className="data-modal-title">Data Modal</h1>
              <p className="data-modal-subtitle">Kelola modal usaha Anda</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="data-modal-content">
        {/* Current Balance Card */}
        <div className="balance-card">
          <div className="balance-card-header">
            <DollarSign size={24} />
            <span>Saldo Modal Saat Ini</span>
          </div>
          <div className="balance-card-amount">
            {formatCurrency(capital?.current_balance || 0)}
          </div>
          <div className="balance-card-footer">
            <span className="balance-card-update">
              Terakhir diupdate: {capital?.updated_at ? formatDateTime(capital.updated_at) : '-'}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="info-cards-grid">
          <div className="info-card">
            <div className="info-card-icon info-icon-blue">
              <Info size={20} />
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Manajemen Modal</h3>
              <p className="info-card-text">Kelola modal usaha dengan mudah. Tambah atau kurangi modal kapan saja dengan tracking lengkap.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-icon info-icon-green">
              <ShoppingCart size={20} />
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Integrasi Pembelian</h3>
              <p className="info-card-text">Modal otomatis terpotong saat membeli motor. Sistem akan validasi saldo sebelum transaksi.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-icon info-icon-purple">
              <FileText size={20} />
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Riwayat Lengkap</h3>
              <p className="info-card-text">Semua transaksi tercatat dengan detail waktu, jumlah, dan saldo sebelum/sesudah transaksi.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-icon info-icon-orange">
              <Shield size={20} />
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Validasi Otomatis</h3>
              <p className="info-card-text">Sistem mencegah transaksi jika saldo tidak mencukupi untuk menjaga akurasi data keuangan.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Compact Design */}
        <div className="action-section">
          <div className="action-section-header">
            <h3 className="action-section-title">Kelola Modal</h3>
            <div className="action-buttons-compact">
              <button
                onClick={() => setActiveForm(activeForm === 'add' ? null : 'add')}
                className={`action-btn-compact action-btn-add ${activeForm === 'add' ? 'active' : ''}`}
              >
                <Plus size={16} />
                <span>Tambah</span>
              </button>
              <button
                onClick={() => setActiveForm(activeForm === 'subtract' ? null : 'subtract')}
                className={`action-btn-compact action-btn-subtract ${activeForm === 'subtract' ? 'active' : ''}`}
              >
                <Minus size={16} />
                <span>Kurangi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Section */}
        {activeForm && (
          <div className="form-section">
            <div className="form-card">
              <h3 className="form-title">
                {activeForm === 'add' ? 'Tambah Modal' : 'Kurangi Modal'}
              </h3>

              <div className="form-group">
                <label className="form-label">Jumlah *</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">Rp</span>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="form-input"
                    placeholder="0"
                    required
                  />
                </div>
                {formData.amount && (
                  <span className="form-helper-text">
                    {formatCurrency(parseFloat(formData.amount.replace(/\./g, '')) || 0)}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                  placeholder="Contoh: Modal awal, Tambahan dari investor, dll."
                  rows="3"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSubmit(activeForm)}
                  className={`btn ${activeForm === 'add' ? 'btn-success' : 'btn-danger'}`}
                >
                  {activeForm === 'add' ? 'Tambah Modal' : 'Kurangi Modal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Transactions Section */}
        <div className="history-transactions-section">
          {/* Section Header with Description */}
          <div className="history-header">
            <div className="history-title-group">
              <div className="history-icon-wrapper">
                <History size={24} color="#F4991A" />
              </div>
              <div>
                <h2 className="history-title">Riwayat Transaksi Modal</h2>
                <p className="history-subtitle">
                  Pantau setiap pergerakan modal usaha Anda. Gunakan filter tanggal untuk analisis periode tertentu dan lihat ringkasan transaksi secara real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Filter and Stats Section */}
          <div className="filter-stats-container">
            {/* Date Filter */}
            <div className="date-filter-section">
              <div className="date-filter-label">
                <Calendar size={16} />
                <span>Filter Periode</span>
              </div>
              <div className="date-filter-inputs">
                <div className="date-input-group">
                  <label>Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                {(startDate || endDate) && (
                  <button onClick={handleResetFilter} className="reset-filter-btn">
                    <X size={16} />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Filter Stats */}
            {(startDate || endDate) && (
              <div className="filter-stats">
                <div className="filter-stat-item stat-add">
                  <TrendingUp size={18} />
                  <div>
                    <span className="filter-stat-label">Total Penambahan</span>
                    <span className="filter-stat-value">{formatCurrency(filterStats.totalAdd)}</span>
                  </div>
                </div>
                <div className="filter-stat-item stat-subtract">
                  <TrendingDown size={18} />
                  <div>
                    <span className="filter-stat-label">Total Pengurangan</span>
                    <span className="filter-stat-value">{formatCurrency(filterStats.totalSubtract)}</span>
                  </div>
                </div>
                <div className="filter-stat-item stat-net">
                  <DollarSign size={18} />
                  <div>
                    <span className="filter-stat-label">Perubahan Bersih</span>
                    <span className={`filter-stat-value ${filterStats.netChange >= 0 ? 'positive' : 'negative'}`}>
                      {filterStats.netChange >= 0 ? '+' : ''}{formatCurrency(filterStats.netChange)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} color="#9ca3af" />
              <p>Tidak ada transaksi ditemukan</p>
              {(startDate || endDate) && (
                <button onClick={handleResetFilter} className="btn-secondary" style={{ marginTop: '16px' }}>
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Tanggal & Waktu</th>
                      <th>Jenis</th>
                      <th>Deskripsi</th>
                      <th className="text-right">Jumlah</th>
                      <th className="text-right">Saldo Sesudah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <div className="table-date">{formatDateTime(transaction.created_at)}</div>
                          </td>
                          <td>
                            <div className={`type-badge ${transaction.transaction_type === 'add' ? 'type-add' : 'type-subtract'}`}>
                              {transaction.transaction_type === 'add' ? (
                                <>
                                  <TrendingUp size={14} />
                                  <span>Tambah</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown size={14} />
                                  <span>Kurang</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="table-description">{transaction.description}</div>
                          </td>
                          <td className="text-right">
                            <span className={`table-amount ${transaction.transaction_type === 'add' ? 'amount-positive' : 'amount-negative'}`}>
                              {transaction.transaction_type === 'add' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="table-balance">{formatCurrency(transaction.balance_after)}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="pagination-container">
                <div className="pagination-info">
                  <span className="pagination-text">
                    Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
                  </span>
                </div>

                <div className="pagination-controls">
                  <div className="per-page-selector">
                    <label>Tampilkan:</label>
                    <select value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(e.target.value)} className="per-page-select">
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                    </select>
                    <span>per halaman</span>
                  </div>

                  <div className="pagination-buttons">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {/* Smart Pagination */}
                    {(() => {
                      const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
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
                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      });
                    })()}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTransactions.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)}
                      className="pagination-btn"
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

      {/* Modals */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        message={alertModal.message}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        message={confirmModal.message}
      />
    </div>
  );
}
