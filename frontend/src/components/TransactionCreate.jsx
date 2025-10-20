import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Phone, MapPin, DollarSign, Calendar, CheckCircle, ArrowLeft, History as HistoryIcon, FileText } from 'lucide-react';
import { GetAvailableMotorsForSale, CreateTransaction } from '../../wailsjs/go/main/App';
import { ConfirmModal } from './Modal';
import './TransactionCreate.css';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatHargaInput = (value) => {
  if (!value) return '';
  const numValue = value.replace(/\D/g, '');
  if (numValue) {
    return new Intl.NumberFormat('id-ID').format(parseInt(numValue));
  }
  return '';
};

const parseHarga = (value) => {
  return parseInt(value.replace(/\D/g, '')) || 0;
};

export default function TransactionCreate() {
  const [motors, setMotors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    motorID: '',
    motorDisplay: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    hargaBeli: '',
    tanggalTransaksi: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadAvailableMotors();
  }, []);

  const loadAvailableMotors = async () => {
    setLoading(true);
    try {
      const response = await GetAvailableMotorsForSale();
      if (response.success) {
        setMotors(response.data || []);
      }
    } catch (error) {
      console.error('Error loading motors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMotors = motors.filter(motor =>
    `${motor.nama_motor} ${motor.nomor_polisi}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMotor = (motor) => {
    setFormData({
      ...formData,
      motorID: motor.id,
      motorDisplay: `${motor.nama_motor} - ${motor.nomor_polisi}`,
      hargaBeli: formatHargaInput(motor.harga.toString()),
    });
    setSearchTerm('');
    setShowDropdown(false);
    setErrors({ ...errors, motorID: '' });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.motorID) newErrors.motorID = 'Pilih motor terlebih dahulu';
    if (!formData.customerName.trim()) newErrors.customerName = 'Nama customer harus diisi';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'No. telepon harus diisi';
    if (!formData.hargaBeli || parseHarga(formData.hargaBeli) <= 0) newErrors.hargaBeli = 'Harga harus diisi';
    if (!formData.tanggalTransaksi) newErrors.tanggalTransaksi = 'Tanggal transaksi harus diisi';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmTransaction = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const response = await CreateTransaction(
        formData.motorID,
        formData.customerName,
        formData.customerPhone,
        formData.customerAddress,
        parseHarga(formData.hargaBeli),
        formData.tanggalTransaksi
      );

      if (response.success) {
        setSuccessData(response.data);
        setShowSuccessModal(true);
        // Reset form
        setFormData({
          motorID: '',
          motorDisplay: '',
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          hargaBeli: '',
          tanggalTransaksi: new Date().toISOString().split('T')[0],
        });
        // Reload motors list
        loadAvailableMotors();
      } else {
        alert(response.message || 'Gagal membuat transaksi');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Terjadi kesalahan saat membuat transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewTransaction = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  if (loading) {
    return (
      <div className="transaction-loading">
        <div className="spinner"></div>
        <p>Memuat data motor...</p>
      </div>
    );
  }

  return (
    <div className="transaction-create-container">
      {/* Header */}
      <div className="transaction-create-header">
        <div className="header-content">
          <div className="header-icon">
            <ShoppingCart size={32} color="#FFFFFF" />
          </div>
          <div className="header-text">
            <h1 className="header-title">Buat Transaksi Baru</h1>
            <p className="header-subtitle">Catat penjualan motor kepada customer dengan lengkap dan akurat</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="info-card">
        <FileText size={20} color="#F4991A" />
        <div className="info-text">
          <h3>Panduan Transaksi</h3>
          <p>Pilih motor yang tersedia, isi data customer, dan konfirmasi transaksi. Sistem akan otomatis mengupdate status motor menjadi terjual dan mencatat tanggal keluar.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-section">
          <h2 className="section-title">
            <ShoppingCart size={20} />
            Pilih Motor
          </h2>

          <div className="form-group">
            <label className="form-label">Motor *</label>
            <div className="motor-select-wrapper">
              <input
                type="text"
                value={formData.motorDisplay || searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Ketik untuk mencari motor..."
                className={`form-input ${errors.motorID ? 'input-error' : ''}`}
              />
              {showDropdown && (
                <div className="motor-dropdown">
                  {loading ? (
                    <div className="motor-option-loading">
                      <div className="spinner-small"></div>
                      <span>Memuat data motor...</span>
                    </div>
                  ) : filteredMotors.length > 0 ? (
                    filteredMotors.map(motor => (
                      <div
                        key={motor.id}
                        className="motor-option"
                        onClick={() => handleSelectMotor(motor)}
                      >
                        <div className="motor-option-main">
                          <span className="motor-name">{motor.nama_motor}</span>
                          <span className="motor-plate">{motor.nomor_polisi}</span>
                        </div>
                        <div className="motor-option-details">
                          <span className="motor-price">{formatCurrency(motor.harga)}</span>
                          <span className="motor-status">Tersedia</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="motor-option-empty">
                      {searchTerm ? 'Tidak ada motor yang cocok dengan pencarian' : 'Tidak ada motor tersedia untuk dijual'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.motorID && <span className="error-text">{errors.motorID}</span>}
            <span className="helper-text">Pilih motor yang akan dijual dari daftar motor tersedia</span>
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">
            <User size={20} />
            Data Customer
          </h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Customer *</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => {
                    setFormData({ ...formData, customerName: e.target.value });
                    setErrors({ ...errors, customerName: '' });
                  }}
                  placeholder="Masukkan nama customer"
                  className={`form-input ${errors.customerName ? 'input-error' : ''}`}
                />
              </div>
              {errors.customerName && <span className="error-text">{errors.customerName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">No. Telepon *</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, customerPhone: e.target.value });
                    setErrors({ ...errors, customerPhone: '' });
                  }}
                  placeholder="08xx-xxxx-xxxx"
                  className={`form-input ${errors.customerPhone ? 'input-error' : ''}`}
                />
              </div>
              {errors.customerPhone && <span className="error-text">{errors.customerPhone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alamat</label>
            <div className="input-with-icon">
              <MapPin size={18} className="input-icon" />
              <textarea
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                placeholder="Masukkan alamat customer (opsional)"
                className="form-textarea"
                rows="3"
              />
            </div>
            <span className="helper-text">Alamat lengkap customer (opsional)</span>
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">
            <DollarSign size={20} />
            Detail Transaksi
          </h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Harga Beli Customer *</label>
              <div className="harga-wrapper">
                <span className="harga-prefix">Rp</span>
                <input
                  type="text"
                  value={formData.hargaBeli}
                  onChange={(e) => {
                    setFormData({ ...formData, hargaBeli: formatHargaInput(e.target.value) });
                    setErrors({ ...errors, hargaBeli: '' });
                  }}
                  placeholder="0"
                  className={`form-input harga-input ${errors.hargaBeli ? 'input-error' : ''}`}
                />
              </div>
              {errors.hargaBeli && <span className="error-text">{errors.hargaBeli}</span>}
              <span className="helper-text">Harga yang dibayar customer (bisa berbeda dari harga jual karena nego)</span>
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal Transaksi *</label>
              <div className="input-with-icon">
                <Calendar size={18} className="input-icon" />
                <input
                  type="date"
                  value={formData.tanggalTransaksi}
                  onChange={(e) => {
                    setFormData({ ...formData, tanggalTransaksi: e.target.value });
                    setErrors({ ...errors, tanggalTransaksi: '' });
                  }}
                  className={`form-input ${errors.tanggalTransaksi ? 'input-error' : ''}`}
                />
              </div>
              {errors.tanggalTransaksi && <span className="error-text">{errors.tanggalTransaksi}</span>}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Memproses...' : 'Buat Transaksi'}
          </button>
        </div>
      </form>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmTransaction}
        title="Konfirmasi Transaksi"
        message={
          <div className="confirm-details">
            <p>Apakah Anda yakin ingin membuat transaksi ini?</p>
            <div className="confirm-info">
              <div className="confirm-row">
                <span className="confirm-label">Motor:</span>
                <span className="confirm-value">{formData.motorDisplay}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">Customer:</span>
                <span className="confirm-value">{formData.customerName}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">Harga:</span>
                <span className="confirm-value">{formatCurrency(parseHarga(formData.hargaBeli))}</span>
              </div>
              <div className="confirm-row">
                <span className="confirm-label">Tanggal:</span>
                <span className="confirm-value">{formData.tanggalTransaksi}</span>
              </div>
            </div>
            <p className="confirm-warning">Motor akan otomatis ditandai sebagai terjual.</p>
          </div>
        }
        confirmText="Ya, Buat Transaksi"
        type="primary"
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">
              <CheckCircle size={64} color="#059669" />
            </div>
            <h2 className="success-title">Transaksi Berhasil!</h2>
            <div className="invoice-number-box">
              <span className="invoice-label">No. Invoice:</span>
              <span className="invoice-value">{successData?.invoice_number}</span>
            </div>
            <p className="success-message">
              Motor <strong>{successData?.motor_nama}</strong> telah terjual kepada <strong>{successData?.customer_name}</strong>
            </p>
            <p className="success-note">
              Transaksi telah dicatat. Gunakan menu <strong>History</strong> di sidebar untuk melihat riwayat transaksi.
            </p>
            <div className="success-actions">
              <button onClick={handleNewTransaction} className="btn btn-primary">
                <ShoppingCart size={18} />
                Buat Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
