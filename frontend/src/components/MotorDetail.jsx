import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, Info, TrendingUp, Package, FileText, Clock, User, Phone, MapPin } from 'lucide-react';
import { GetMotorByID, GetMotorDocuments, GetMotorDocumentFile, DeleteMotorDocument } from '../../wailsjs/go/main/App';
import DocumentList from './DocumentList';
import DocumentPreview from './DocumentPreview';
import './MotorDetail.css';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatTanggal = (dateString) => {
  if (!dateString) return '-';
  return dateString.split('T')[0];
};

const STATUS_CONFIG = {
  baru_masuk: { label: 'Baru Masuk', color: '#6366f1' },
  tersedia: { label: 'Tersedia', color: '#F4991A' },
  terjual: { label: 'Terjual', color: '#059669' },
  dalam_perbaikan: { label: 'Dalam Perbaikan', color: '#D97706' }
};

export default function MotorDetail({ motorId, onBack }) {
  const [motor, setMotor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewFileData, setPreviewFileData] = useState(null);

  useEffect(() => {
    loadMotorDetail();
    loadDocuments();
  }, [motorId]);

  const loadMotorDetail = async () => {
    try {
      setLoading(true);
      const response = await GetMotorByID(motorId);
      if (response.success) {
        setMotor(response.data);
      }
    } catch (error) {
      console.error('Error loading motor detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await GetMotorDocuments(motorId);
      if (response.success) {
        setDocuments(response.data || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDocumentClick = async (doc) => {
    try {
      const response = await GetMotorDocumentFile(doc.id);
      if (response.success) {
        setPreviewDocument(response.data.document);
        setPreviewFileData(response.data.file_data);
      }
    } catch (error) {
      console.error('Error loading document file:', error);
    }
  };

  const closePreview = () => {
    setPreviewDocument(null);
    setPreviewFileData(null);
  };

  if (loading) {
    return (
      <div className="motor-detail-loading">
        <div className="motor-detail-spinner"></div>
        <p>Memuat detail motor...</p>
      </div>
    );
  }

  if (!motor) {
    return (
      <div className="motor-detail-error">
        <p>Motor tidak ditemukan</p>
        <button onClick={onBack} className="motor-detail-back-btn">
          <ArrowLeft size={20} />
          Kembali
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[motor.status] || STATUS_CONFIG.tersedia;
  const keuntungan = motor.harga - motor.harga_modal;
  const persentaseKeuntungan = motor.harga_modal > 0 ? ((keuntungan / motor.harga_modal) * 100).toFixed(1) : 0;

  // Get pajak status
  const currentYear = new Date().getFullYear();
  const pajakYear = parseInt(motor.pajak_date);
  const isPajakMati = pajakYear < currentYear;
  const pajakStatus = isPajakMati ? `Pajak Mati (${motor.pajak_date})` : `Pajak Hidup (${motor.pajak_date})`;

  return (
    <div className="motor-detail-container">
      {/* Header */}
      <div className="motor-detail-header">
        <button onClick={onBack} className="motor-detail-back-btn">
          <ArrowLeft size={18} />
          Kembali ke Inventory
        </button>

        <div className="motor-detail-header-content">
          <div className="motor-detail-title-section">
            <h1 className="motor-detail-title">{motor.nama_motor}</h1>
            <p className="motor-detail-subtitle">{motor.nomor_polisi}</p>
          </div>

          <div className="motor-detail-status-badge" style={{ borderLeftColor: statusConfig.color }}>
            <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="motor-detail-content">
        {/* Informasi Keuangan */}
        <div className="detail-section">
          <div className="section-header">
            <DollarSign size={20} />
            <h2>Informasi Keuangan</h2>
          </div>

          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Harga Modal (Beli)</span>
              <span className="detail-value text-red">{formatCurrency(motor.harga_modal)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Harga Jual</span>
              <span className="detail-value text-green">{formatCurrency(motor.harga)}</span>
            </div>
            <div className="detail-divider"></div>
            <div className="detail-row highlight">
              <div className="detail-label-icon">
                <TrendingUp size={18} />
                <span>Keuntungan</span>
              </div>
              <div className="profit-info">
                <span className={`detail-value-large ${keuntungan >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatCurrency(keuntungan)}
                </span>
                <span className={`profit-badge ${keuntungan >= 0 ? 'badge-green' : 'badge-red'}`}>
                  {keuntungan >= 0 ? '+' : ''}{persentaseKeuntungan}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Motor */}
        <div className="detail-section">
          <div className="section-header">
            <Info size={20} />
            <h2>Informasi Motor</h2>
          </div>

          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Warna</span>
              <span className="detail-value">
                <span className="color-display">
                  <span className="color-dot" style={{ backgroundColor: getColorFromName(motor.warna) }}></span>
                  {motor.warna || 'Tidak diketahui'}
                </span>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Tahun Motor</span>
              <span className="detail-value">{motor.tahun_motor || '-'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status Pajak</span>
              <span className="detail-value">
                <span className={`pajak-badge ${isPajakMati ? 'pajak-mati' : 'pajak-hidup'}`}>
                  {pajakStatus}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Informasi Penjual */}
        {(motor.nama_penjual || motor.telepon_penjual || motor.alamat_penjual) && (
          <div className="detail-section">
            <div className="section-header">
              <User size={20} />
              <h2>Informasi Penjual</h2>
            </div>

            <div className="detail-card">
              {motor.nama_penjual && (
                <div className="detail-row">
                  <div className="detail-label-icon">
                    <User size={16} />
                    <span>Nama Penjual</span>
                  </div>
                  <span className="detail-value font-semibold">{motor.nama_penjual}</span>
                </div>
              )}

              {motor.telepon_penjual && (
                <div className="detail-row">
                  <div className="detail-label-icon">
                    <Phone size={16} />
                    <span>No. Telepon</span>
                  </div>
                  <span className="detail-value">
                    <a href={`tel:${motor.telepon_penjual}`} className="phone-link">
                      {motor.telepon_penjual}
                    </a>
                  </span>
                </div>
              )}

              {motor.alamat_penjual && (
                <div className="detail-row">
                  <div className="detail-label-icon">
                    <MapPin size={16} />
                    <span>Alamat</span>
                  </div>
                  <span className="detail-value">{motor.alamat_penjual}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Informasi Tanggal */}
        <div className="detail-section">
          <div className="section-header">
            <Calendar size={20} />
            <h2>Riwayat Tanggal</h2>
          </div>

          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Tanggal Masuk</span>
              <span className="detail-value">{formatTanggal(motor.tanggal_masuk)}</span>
            </div>

            {motor.tanggal_keluar && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Tanggal Keluar</span>
                  <span className="detail-value">{formatTanggal(motor.tanggal_keluar)}</span>
                </div>

                <div className="detail-divider"></div>

                <div className="detail-row highlight">
                  <div className="detail-label-icon">
                    <Clock size={18} />
                    <span>Durasi di Inventory</span>
                  </div>
                  <span className="detail-value">{calculateDuration(motor.tanggal_masuk, motor.tanggal_keluar)} hari</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dokumen Motor */}
        <div className="detail-section full-width">
          <div className="section-header">
            <FileText size={20} />
            <h2>Dokumen Motor</h2>
          </div>

          <div className="detail-card">
            {loadingDocuments ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Memuat dokumen...</p>
              </div>
            ) : (
              <DocumentList
                documents={documents}
                onDocumentClick={handleDocumentClick}
                editable={false}
              />
            )}
          </div>
        </div>

        {/* Informasi Sistem */}
        <div className="detail-section full-width">
          <div className="section-header">
            <FileText size={20} />
            <h2>Informasi Sistem</h2>
          </div>

          <div className="detail-card">
            <div className="system-info-grid">
              <div className="system-info-item">
                <span className="system-label">ID Motor</span>
                <span className="system-value">{motor.id}</span>
              </div>
              <div className="system-info-item">
                <span className="system-label">Dibuat</span>
                <span className="system-value">{new Date(motor.created_at).toLocaleString('id-ID')}</span>
              </div>
              <div className="system-info-item">
                <span className="system-label">Terakhir Diupdate</span>
                <span className="system-value">{new Date(motor.updated_at).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal - View Only */}
      {previewDocument && previewFileData && (
        <DocumentPreview
          document={previewDocument}
          fileData={previewFileData}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

// Helper functions
function getColorFromName(colorName) {
  const colorMap = {
    'merah': '#ef4444',
    'putih': '#f3f4f6',
    'hitam': '#1f2937',
    'biru': '#3b82f6',
    'hijau': '#10b981',
    'kuning': '#eab308',
    'orange': '#f97316',
    'abu-abu': '#6b7280',
    'silver': '#9ca3af',
    'pink': '#ec4899',
    'ungu': '#a855f7',
    'coklat': '#92400e',
  };
  return colorMap[colorName?.toLowerCase()] || '#94a3b8';
}

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
