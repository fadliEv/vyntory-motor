import React, { useState, useEffect, useRef } from 'react';
import { History, Search, Calendar, ChevronLeft, ChevronRight, User, Phone, DollarSign, X, FileText, Eye, MapPin, Bike } from 'lucide-react';
import { GetTransactions, SearchTransactions } from '../../wailsjs/go/main/App';
import './TransactionCreate.css';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const itemsPerPage = 10;
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, startDate, endDate]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await GetTransactions();
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      if (searchTerm || startDate || endDate) {
        const response = await SearchTransactions(searchTerm, startDate, endDate);
        if (response.success) {
          setTransactions(response.data || []);
        }
      } else {
        await loadTransactions();
      }
      setCurrentPage(1);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    loadTransactions();
  };

  const handleShowDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedTransaction(null);
  };

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const getPaginationButtons = () => {
    const buttons = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      buttons.push(1);
      if (currentPage <= 3) {
        buttons.push(2, 3, '...');
      } else if (currentPage >= totalPages - 2) {
        buttons.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          buttons.push(i);
        }
      } else {
        buttons.push('...');
        buttons.push(currentPage - 1, currentPage, currentPage + 1);
        buttons.push('...');
      }
      if (!buttons.includes(totalPages)) {
        buttons.push(totalPages);
      }
    }
    return buttons;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="transaction-loading">
        <div className="spinner"></div>
        <p>Memuat history transaksi...</p>
      </div>
    );
  }

  return (
    <div className="transaction-history-container">
      {/* Header */}
      <div className="transaction-history-header">
        <div className="header-content">
          <div className="header-icon">
            <History size={32} color="#FFFFFF" />
          </div>
          <div className="header-text">
            <h1 className="header-title">History Transaksi</h1>
            <p className="header-subtitle">Riwayat semua transaksi penjualan motor yang telah dilakukan</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="info-card">
        <FileText size={20} color="#F4991A" />
        <div className="info-text">
          <h3>Informasi History</h3>
          <p>Lihat dan lacak semua transaksi penjualan. Gunakan filter tanggal atau kata kunci untuk mencari transaksi tertentu berdasarkan nama customer, nomor telepon, nama motor, atau nomor polisi.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="search-group">
            <Search size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari customer, motor, no. polisi, atau no. telepon..."
              className="filter-input"
            />
          </div>

          <div className="date-group">
            <Calendar size={18} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-date"
              placeholder="Dari Tanggal"
            />
          </div>

          <div className="date-group">
            <Calendar size={18} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-date"
              placeholder="Sampai Tanggal"
            />
          </div>

          {(searchTerm || startDate || endDate) && (
            <button onClick={handleResetFilters} className="reset-btn">
              <X size={16} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {(searchTerm || startDate || endDate) && (
        <div className="results-summary">
          <History size={16} />
          <span>{transactions.length} transaksi ditemukan</span>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {transactions.length === 0 ? (
          <div className="empty-state">
            <History size={64} color="#9ca3af" />
            <p>Belum ada transaksi</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Invoice</th>
                    <th>Tanggal</th>
                    <th>Customer</th>
                    <th>Kontak</th>
                    <th>Motor</th>
                    <th>No. Polisi</th>
                    <th className="text-right">Harga Jual</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((trx, idx) => {
                    const rowNumber = startIndex + idx + 1;
                    return (
                      <tr key={trx.id} onClick={() => handleShowDetail(trx)} className="clickable-row">
                        <td className="td-number">{rowNumber}</td>
                        <td className="td-invoice">
                          <span className="invoice-badge">{trx.invoice_number}</span>
                        </td>
                        <td className="td-date">{formatDate(trx.tanggal_transaksi)}</td>
                        <td className="td-customer">
                          <div className="customer-cell">
                            <User size={16} />
                            <span>{trx.customer_name}</span>
                          </div>
                        </td>
                        <td className="td-phone">
                          <div className="phone-cell">
                            <Phone size={16} />
                            <span>{trx.customer_phone}</span>
                          </div>
                        </td>
                        <td className="td-motor">{trx.motor_nama}</td>
                        <td className="td-plate">{trx.motor_nomor_polisi}</td>
                        <td className="td-price text-right">
                          <div className="price-cell">
                            <DollarSign size={16} />
                            <span>{formatCurrency(trx.harga_beli)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Menampilkan {startIndex + 1} - {Math.min(endIndex, transactions.length)} dari {transactions.length} transaksi
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="pagination-numbers">
                    {getPaginationButtons().map((page, idx) =>
                      page === '...' ? (
                        <span key={idx} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(page)}
                          className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleCloseDetail} className="modal-close-btn">
              <X size={24} />
            </button>

            <div className="detail-modal-body">
              {/* Header dengan Invoice */}
              <div className="modal-header-section">
                <h2 className="modal-title">Detail Transaksi</h2>
                <p className="modal-description">
                  Berikut adalah informasi lengkap transaksi penjualan motor yang telah dilakukan kepada customer
                </p>

                <div className="invoice-date-container">
                  <div className="invoice-number">{selectedTransaction.invoice_number}</div>
                  <div className="transaction-date">
                    <Calendar size={16} />
                    <span>{formatDateTime(selectedTransaction.tanggal_transaksi)}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="modal-divider"></div>

              {/* Motor Information */}
              <div className="info-block">
                <div className="block-header">
                  <Bike size={20} />
                  <h3>Informasi Motor</h3>
                </div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Nama Motor</span>
                    <span className="value">{selectedTransaction.motor_nama}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">No. Polisi</span>
                    <span className="value">{selectedTransaction.motor_nomor_polisi}</span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="info-block">
                <div className="block-header">
                  <User size={20} />
                  <h3>Informasi Customer</h3>
                </div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Nama</span>
                    <span className="value">{selectedTransaction.customer_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">No. Telepon</span>
                    <span className="value">{selectedTransaction.customer_phone}</span>
                  </div>
                  {selectedTransaction.customer_address && (
                    <div className="info-row full-width">
                      <span className="label">
                        <MapPin size={16} />
                        Alamat
                      </span>
                      <span className="value address">{selectedTransaction.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Section */}
              <div className="price-section">
                <span className="price-label">Total Harga</span>
                <span className="price-value">{formatCurrency(selectedTransaction.harga_beli)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
