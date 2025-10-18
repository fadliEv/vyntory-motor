import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, TrendingUp, TrendingDown, History, AlertCircle, DollarSign } from 'lucide-react';
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

export default function DataModal() {
  const [capital, setCapital] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // 'add' or 'subtract'

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

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current capital
      const capitalResponse = await GetCurrentCapital();
      if (capitalResponse.success) {
        setCapital(capitalResponse.data);
      }

      // Load recent transactions (5 latest)
      const transactionsResponse = await GetCapitalTransactions();
      if (transactionsResponse.success && transactionsResponse.data) {
        const transactions = Array.isArray(transactionsResponse.data)
          ? transactionsResponse.data
          : [];
        setRecentTransactions(transactions.slice(0, 5));
      } else {
        setRecentTransactions([]);
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

  const resetForm = () => {
    setFormData({ amount: '', description: '' });
    setActiveForm(null);
  };

  const handleSubmit = async (type) => {
    // Validation
    const amount = parseFloat(formData.amount);
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
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    setFormData({ ...formData, amount: cleaned });
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

        {/* Action Buttons */}
        <div className="action-buttons-container">
          <button
            onClick={() => setActiveForm(activeForm === 'add' ? null : 'add')}
            className={`action-btn action-btn-add ${activeForm === 'add' ? 'active' : ''}`}
          >
            <Plus size={20} />
            <span>Tambah Modal</span>
          </button>
          <button
            onClick={() => setActiveForm(activeForm === 'subtract' ? null : 'subtract')}
            className={`action-btn action-btn-subtract ${activeForm === 'subtract' ? 'active' : ''}`}
          >
            <Minus size={20} />
            <span>Kurangi Modal</span>
          </button>
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
                    {formatCurrency(parseFloat(formData.amount) || 0)}
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

        {/* Recent Transactions */}
        <div className="recent-transactions-section">
          <div className="section-header">
            <History size={20} />
            <h2>Transaksi Terbaru</h2>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} color="#9ca3af" />
              <p>Belum ada transaksi</p>
            </div>
          ) : (
            <div className="transactions-list">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    {transaction.transaction_type === 'add' ? (
                      <TrendingUp size={20} color="#059669" />
                    ) : (
                      <TrendingDown size={20} color="#dc2626" />
                    )}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-description">{transaction.description}</div>
                    <div className="transaction-date">{formatDateTime(transaction.created_at)}</div>
                  </div>
                  <div className="transaction-amount">
                    <span className={transaction.transaction_type === 'add' ? 'amount-positive' : 'amount-negative'}>
                      {transaction.transaction_type === 'add' ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </span>
                    <div className="transaction-balance">
                      Saldo: {formatCurrency(transaction.balance_after)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
