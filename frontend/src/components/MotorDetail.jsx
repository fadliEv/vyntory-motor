import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, Palette, FileText, TrendingUp, Info, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { GetMotorByID } from '../../wailsjs/go/main/App';
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
  baru_masuk: {
    label: 'Baru Masuk',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    icon: Clock,
    description: 'Motor baru masuk inventory, sedang dalam proses persiapan'
  },
  tersedia: {
    label: 'Tersedia',
    color: '#F4991A',
    bgColor: 'rgba(244, 153, 26, 0.1)',
    icon: CheckCircle,
    description: 'Motor siap dijual dan tersedia untuk transaksi'
  },
  terjual: {
    label: 'Terjual',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.1)',
    icon: TrendingUp,
    description: 'Motor sudah terjual kepada pembeli'
  },
  dalam_perbaikan: {
    label: 'Dalam Perbaikan',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    icon: AlertTriangle,
    description: 'Motor sedang dalam proses perbaikan/service'
  }
};

export default function MotorDetail({ motorId, onBack }) {
  const [motor, setMotor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMotorDetail();
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
  const StatusIcon = statusConfig.icon;
  const keuntungan = motor.harga - motor.harga_modal;
  const persentaseKeuntungan = motor.harga_modal > 0 ? ((keuntungan / motor.harga_modal) * 100).toFixed(1) : 0;

  return (
    <div className="motor-detail-container">
      {/* Header Section */}
      <div className="motor-detail-header">
        <button onClick={onBack} className="motor-detail-back-btn">
          <ArrowLeft size={20} />
          Kembali ke Inventory
        </button>

        <div className="motor-detail-header-content">
          <div className="motor-detail-title-section">
            <h1 className="motor-detail-title">{motor.nama_motor}</h1>
            <p className="motor-detail-subtitle">{motor.nomor_polisi}</p>
          </div>

          <div className="motor-detail-status-badge" style={{
            backgroundColor: statusConfig.bgColor,
            borderLeft: `4px solid ${statusConfig.color}`
          }}>
            <StatusIcon size={20} style={{ color: statusConfig.color }} />
            <div>
              <p className="status-label" style={{ color: statusConfig.color }}>{statusConfig.label}</p>
              <p className="status-description">{statusConfig.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Wave */}
      <div className="motor-detail-wave">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                fill="rgba(244, 153, 26, 0.05)"></path>
        </svg>
      </div>

      {/* Main Content Grid */}
      <div className="motor-detail-grid">
        {/* Left Column - Financial Info */}
        <div className="motor-detail-section">
          <h2 className="section-title">
            <DollarSign size={24} />
            Informasi Keuangan
          </h2>

          <div className="detail-card detail-card-highlight">
            <div className="detail-row">
              <span className="detail-label">Harga Modal (Beli)</span>
              <span className="detail-value detail-value-modal">{formatCurrency(motor.harga_modal)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Harga Jual</span>
              <span className="detail-value detail-value-jual">{formatCurrency(motor.harga)}</span>
            </div>
            <div className="detail-divider"></div>
            <div className="detail-row detail-row-profit">
              <span className="detail-label">
                <TrendingUp size={18} />
                Keuntungan
              </span>
              <div className="profit-info">
                <span className={`detail-value ${keuntungan >= 0 ? 'detail-value-profit' : 'detail-value-loss'}`}>
                  {formatCurrency(keuntungan)}
                </span>
                <span className={`profit-percentage ${keuntungan >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  {keuntungan >= 0 ? '+' : ''}{persentaseKeuntungan}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Motor Info */}
        <div className="motor-detail-section">
          <h2 className="section-title">
            <Info size={24} />
            Informasi Motor
          </h2>

          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">
                <Palette size={16} />
                Warna
              </span>
              <span className="detail-value">
                <span className="color-badge">
                  <span className="color-dot" style={{
                    background: getColorFromName(motor.warna)
                  }}></span>
                  {motor.warna || 'Tidak Diketahui'}
                </span>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <FileText size={16} />
                Pajak Hidup Sampai
              </span>
              <span className="detail-value">
                <span className={`pajak-badge ${isPajakExpiring(motor.pajak_hidup_sampai) ? 'pajak-expiring' : ''}`}>
                  {motor.pajak_hidup_sampai || '-'}
                </span>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                <Calendar size={16} />
                Tanggal Masuk
              </span>
              <span className="detail-value">{formatTanggal(motor.tanggal_masuk)}</span>
            </div>

            {motor.tanggal_keluar && (
              <div className="detail-row">
                <span className="detail-label">
                  <Calendar size={16} />
                  Tanggal Keluar
                </span>
                <span className="detail-value">{formatTanggal(motor.tanggal_keluar)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      {motor.tanggal_keluar && (
        <div className="motor-detail-section motor-detail-full-width">
          <h2 className="section-title">
            <Clock size={24} />
            Timeline Motor
          </h2>

          <div className="timeline-card">
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot timeline-dot-start"></div>
                <div className="timeline-content">
                  <p className="timeline-label">Masuk Inventory</p>
                  <p className="timeline-date">{formatTanggal(motor.tanggal_masuk)}</p>
                </div>
              </div>

              <div className="timeline-line"></div>

              <div className="timeline-item">
                <div className="timeline-dot timeline-dot-end"></div>
                <div className="timeline-content">
                  <p className="timeline-label">Keluar / Terjual</p>
                  <p className="timeline-date">{formatTanggal(motor.tanggal_keluar)}</p>
                </div>
              </div>
            </div>

            <div className="timeline-duration">
              <Info size={16} />
              <span>Durasi di inventory: {calculateDuration(motor.tanggal_masuk, motor.tanggal_keluar)} hari</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="motor-detail-summary">
        <div className="summary-item">
          <span className="summary-label">ID Motor</span>
          <span className="summary-value">{motor.id}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Dibuat</span>
          <span className="summary-value">{new Date(motor.created_at).toLocaleString('id-ID')}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Terakhir Diupdate</span>
          <span className="summary-value">{new Date(motor.updated_at).toLocaleString('id-ID')}</span>
        </div>
      </div>
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
    'pink': '#ec4899',
    'ungu': '#a855f7',
  };
  return colorMap[colorName?.toLowerCase()] || '#94a3b8';
}

function isPajakExpiring(tahun) {
  if (!tahun) return false;
  const currentYear = new Date().getFullYear();
  const pajakYear = parseInt(tahun);
  return pajakYear <= currentYear + 1; // Expiring within 1 year
}

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
