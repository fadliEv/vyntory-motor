import React, { useState, useEffect } from 'react';
import './App.css';
import { formatDate, formatDateForInput } from './utils/dateUtils';

function App() {
  const [motors, setMotors] = useState([]);
  const [filteredMotors, setFilteredMotors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [pendapatanBulanan, setPendapatanBulanan] = useState([]);
  const [activeTab, setActiveTab] = useState('motor');

  const [formData, setFormData] = useState({
    id: '',
    nama_motor: '',
    nomor_polisi: '',
    status: 'tersedia',
    harga: '',
    tanggal_masuk: new Date().toISOString().split('T')[0]
  });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // State untuk filter
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadMotors();
    loadFinancialSummary();
    loadPendapatanBulanan();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [motors, filterBulan, filterTahun, filterStatus, searchQuery]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadMotors = async () => {
    setLoading(true);
    try {
      const result = await window.go.main.App.GetMotors();
      if (result.success) {
        setMotors(result.data || []);
      } else {
        showMessage('error', result.message || 'Gagal memuat data motor');
      }
    } catch (error) {
      console.error('Error loading motors:', error);
      showMessage('error', 'Error: ' + error.message);
    }
    setLoading(false);
  };

  const loadFinancialSummary = async () => {
    try {
      const result = await window.go.main.App.GetFinancialSummary();
      if (result.success) {
        setFinancialSummary(result.data);
      } else {
        console.error('Gagal memuat ringkasan keuangan:', result.message);
      }
    } catch (error) {
      console.error('Error loading financial summary:', error);
    }
  };

  // Fungsi untuk load data pendapatan bulanan
  const loadPendapatanBulanan = async () => {
    try {
      console.log('🔍 Memuat data pendapatan bulanan...');
      const result = await window.go.main.App.GetPendapatanBulanan();
      console.log('📊 Response pendapatan bulanan:', result);

      if (result.success) {
        const data = Array.isArray(result.data) ? result.data : [];
        console.log(`✅ Data pendapatan bulanan: ${data.length} bulan`);
        setPendapatanBulanan(data);
      } else {
        console.warn('Tidak ada data pendapatan bulanan');
        setPendapatanBulanan([]);
      }
    } catch (error) {
      console.error('Error loading pendapatan bulanan:', error);
      setPendapatanBulanan([]);
    }
  };

  // Fungsi debug untuk cek data motor terjual
  // const debugMotorsTerjual = async () => {
  //   try {
  //     console.log('🐛 Debug motors terjual...');
  //     const result = await window.go.main.App.DebugMotorsTerjual();
  //     console.log('🔍 Debug result:', result);
  //   } catch (error) {
  //     console.error('Error debugging:', error);
  //   }
  // };

  // Fungsi untuk apply semua filter
  const applyFilters = () => {
    let filtered = [...motors];

    // Filter berdasarkan search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(motor =>
        motor.nama_motor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        motor.nomor_polisi.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter berdasarkan status (jika bukan 'all')
    if (filterStatus !== 'all') {
      filtered = filtered.filter(motor => motor.status === filterStatus);
    }

    // Filter berdasarkan tahun (jika bukan 'all')
    if (filterTahun !== 'all') {
      filtered = filtered.filter(motor => {
        try {
          const tanggal = new Date(motor.tanggal_masuk);
          const tahunMotor = tanggal.getFullYear();
          return tahunMotor === parseInt(filterTahun);
        } catch (error) {
          console.error('Error parsing date:', motor.tanggal_masuk, error);
          return false;
        }
      });
    }

    // Filter berdasarkan bulan (hanya jika dipilih)
    if (filterBulan) {
      filtered = filtered.filter(motor => {
        try {
          const tanggal = new Date(motor.tanggal_masuk);
          const bulanMotor = tanggal.getMonth() + 1;
          return bulanMotor === parseInt(filterBulan);
        } catch (error) {
          console.error('Error parsing date:', motor.tanggal_masuk, error);
          return false;
        }
      });
    }

    setFilteredMotors(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;

      if (editing) {
        result = await window.go.main.App.UpdateMotor(
          formData.id,
          formData.nama_motor,
          formData.nomor_polisi,
          formData.status,
          parseFloat(formData.harga),
          formData.tanggal_masuk
        );
      } else {
        result = await window.go.main.App.AddMotor(
          formData.nama_motor,
          formData.nomor_polisi,
          formData.status,
          parseFloat(formData.harga),
          formData.tanggal_masuk
        );
      }

      if (result.success) {
        showMessage('success', result.message);
        resetForm();
        loadMotors();
        loadFinancialSummary();
        loadPendapatanBulanan();
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      console.error('Error saving motor:', error);
      showMessage('error', 'Terjadi kesalahan saat menyimpan data: ' + error.message);
    }
    setLoading(false);
  };

  const handleEdit = (motor) => {
    setFormData({
      id: motor.id,
      nama_motor: motor.nama_motor,
      nomor_polisi: motor.nomor_polisi,
      status: motor.status,
      harga: motor.harga.toString(),
      tanggal_masuk: formatDateForInput(motor.tanggal_masuk)
    });
    setEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus motor ini?')) return;

    try {
      const result = await window.go.main.App.DeleteMotor(id);

      if (result.success) {
        showMessage('success', result.message);
        loadMotors();
        loadFinancialSummary();
        loadPendapatanBulanan();
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      console.error('Error deleting motor:', error);
      showMessage('error', 'Terjadi kesalahan saat menghapus data');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      nama_motor: '',
      nomor_polisi: '',
      status: 'tersedia',
      harga: '',
      tanggal_masuk: new Date().toISOString().split('T')[0]
    });
    setEditing(false);
    setShowForm(false);
  };

  const handleSearch = () => {
    applyFilters();
    if (searchQuery.trim()) {
      showMessage('info', `Ditemukan ${filteredMotors.length} hasil pencarian`);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterBulan('');
    setFilterTahun('all');
    setFilterStatus('all');
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const result = await window.go.main.App.UpdateMotorStatus(id, newStatus);

      if (result.success) {
        showMessage('success', 'Status berhasil diupdate' + (newStatus === 'terjual' ? ' - Motor tercatat sebagai terjual' : ''));
        loadMotors();
        loadFinancialSummary();
        loadPendapatanBulanan();
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showMessage('error', 'Terjadi kesalahan saat update status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      tersedia: { className: 'status-badge status-tersedia', label: 'Tersedia' },
      terjual: { className: 'status-badge status-terjual', label: 'Terjual' },
      dalam_perbaikan: { className: 'status-badge status-perbaikan', label: 'Perbaikan' }
    };

    const config = statusConfig[status] || statusConfig.tersedia;
    return (
      <span className={config.className}>
        {config.label}
      </span>
    );
  };

  // Get nama status untuk display
  const getStatusName = (status) => {
    const statusNames = {
      tersedia: 'Tersedia',
      terjual: 'Terjual',
      dalam_perbaikan: 'Perbaikan',
      all: 'Semua Status'
    };
    return statusNames[status] || status;
  };

  // Get persentase perubahan warna
  const getPercentageColor = (percentage) => {
    if (percentage > 0) return 'positive';
    if (percentage < 0) return 'negative';
    return 'neutral';
  };

  // Get icon persentase
  const getPercentageIcon = (percentage) => {
    if (percentage > 0) return '↗';
    if (percentage < 0) return '↘';
    return '→';
  };

  // Generate pilihan tahun dari data yang ada + semua tahun
  const getAvailableYears = () => {
    const years = new Set();

    years.add('all');

    motors.forEach(motor => {
      try {
        const tanggal = new Date(motor.tanggal_masuk);
        const tahun = tanggal.getFullYear();
        years.add(tahun);
      } catch (error) {
        console.error('Error parsing date:', motor.tanggal_masuk, error);
      }
    });

    const currentYear = new Date().getFullYear();
    years.add(currentYear);

    return Array.from(years).sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return b - a;
    });
  };

  // Get nama bulan Indonesia
  const getBulanName = (bulanNumber) => {
    const bulanNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return bulanNames[bulanNumber - 1] || '';
  };

  // Komponen Tab Navigation
  const TabNavigation = () => (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'motor' ? 'tab-active' : ''}`}
        onClick={() => setActiveTab('motor')}
      >
        Data Motor
      </button>
      <button
        className={`tab-button ${activeTab === 'pendapatan' ? 'tab-active' : ''}`}
        onClick={() => setActiveTab('pendapatan')}
      >
        Pendapatan Bulanan
      </button>
       
      {/* <button
        className="tab-button"
        onClick={debugMotorsTerjual}
        style={{ background: '#fef3c7', color: '#92400e' }}
      >
        🐛 Debug
      </button> */}
    </div>
  );

  // Komponen untuk Financial Summary Cards
  const FinancialSummary = () => {
    if (!financialSummary) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Memuat data keuangan...</p>
        </div>
      );
    }

    return (
      <div className="financial-summary">
        <div className="summary-header">
          <h2>Ringkasan Keuangan</h2>
          <p className="update-time">Update: {financialSummary.updated_at}</p>
        </div>

        <div className="stats-grid">
          {/* Total Modal */}
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg className="stat-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Modal</div>
              <div className="stat-value">{formatCurrency(financialSummary.total_modal)}</div>
              <div className="stat-description">Nilai inventory saat ini</div>
            </div>
          </div>

          {/* Total Pendapatan */}
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg className="stat-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Pendapatan</div>
              <div className="stat-value">{formatCurrency(financialSummary.total_pendapatan)}</div>
              <div className="stat-description">Dari semua penjualan</div>
            </div>
          </div>

          {/* Pendapatan Bulan Ini */}
          <div className="stat-card">
            <div className="stat-icon stat-icon-purple">
              <svg className="stat-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Pendapatan Bulan Ini</div>
              <div className="stat-value">{formatCurrency(financialSummary.pendapatan_bulan_ini)}</div>
              <div className={`stat-percentage ${getPercentageColor(financialSummary.persentase_perubahan)}`}>
                {getPercentageIcon(financialSummary.persentase_perubahan)}
                {Math.abs(financialSummary.persentase_perubahan || 0).toFixed(1)}% vs bulan lalu
              </div>
            </div>
          </div>

          {/* Pengeluaran Harian */}
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <svg className="stat-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-label">Pengeluaran Harian</div>
              <div className="stat-value">{formatCurrency(financialSummary.pengeluaran_harian)}</div>
              <div className="stat-description">Rata-rata 30 hari terakhir</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Komponen untuk Pendapatan Bulanan
  const PendapatanBulanan = () => {
    // Hitung total keseluruhan
    const totalKeseluruhan = pendapatanBulanan.reduce((total, item) => total + (item.total_penjualan || 0), 0);
    const totalMotorTerjual = pendapatanBulanan.reduce((total, item) => total + (item.jumlah_terjual || 0), 0);

    return (
      <div className="table-container">
        <div className="table-header-info">
          <h3>Pendapatan Bulanan</h3>
          <p>Data pendapatan dari semua motor yang terjual (seluruh periode)</p>
          <div style={{
            background: '#f0f9ff',
            padding: '12px',
            borderRadius: '6px',
            marginTop: '12px',
            fontSize: '14px',
            color: '#0369a1',
            border: '1px solid #bae6fd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <strong>Total Keseluruhan:</strong> {formatCurrency(totalKeseluruhan)}
            </div>
            <div>
              <strong>Total Motor Terjual:</strong> {totalMotorTerjual} unit
            </div>
            <div>
              <strong>Periode:</strong> {pendapatanBulanan.length} bulan
            </div>
          </div>
        </div>

        {pendapatanBulanan.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="empty-text">
              Belum ada data pendapatan bulanan
            </p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Data akan muncul ketika ada motor yang terjual
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Bulan</th>
                  <th className="table-header-cell">Jumlah Motor Terjual</th>
                  <th className="table-header-cell">Total Pendapatan</th>
                  <th className="table-header-cell">Rata-rata per Motor</th>
                  <th className="table-header-cell">Persentase</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {pendapatanBulanan.map((item, index) => {
                  const persentase = totalKeseluruhan > 0 ? ((item.total_penjualan / totalKeseluruhan) * 100) : 0;

                  return (
                    <tr key={index} className="table-row">
                      <td className="table-cell">
                        <div className="bulan-info">
                          <div className="bulan-nama">
                            {item.bulan_nama || `Bulan ${item.bulan}`}
                          </div>
                          <div className="bulan-tahun">{item.tahun}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="jumlah-terjual">
                          <span className="jumlah">{item.jumlah_terjual}</span> unit
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="pendapatan-total">
                          {formatCurrency(item.total_penjualan)}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="rata-rata">
                          {item.jumlah_terjual > 0
                            ? formatCurrency(item.total_penjualan / item.jumlah_terjual)
                            : formatCurrency(0)
                          }
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="persentase" style={{
                          color: '#059669',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        }}>
                          {persentase.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const tahunOptions = getAvailableYears();

  return (
    <div className="app">
      {/* Message Notification */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">Dealer Motor Management</h1>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Tambah Motor
          </button>
        </div>
      </header>

      <div className="container">
        {/* Financial Summary Section */}
        <FinancialSummary />

        {/* Tab Navigation */}
        <TabNavigation />

        {activeTab === 'motor' ? (
          <>
            {/* Search and Filter Section */}
            <div className="search-section">
              <div className="search-content">
                <div className="filter-grid">
                  {/* Search Input */}
                  <div className="filter-group">
                    <label className="filter-label">Cari Motor</label>
                    <div className="search-input-container">
                      <input
                        type="text"
                        placeholder="Cari nama motor atau nomor polisi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="search-input"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="filter-group">
                    <label className="filter-label">Filter Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Semua Status</option>
                      <option value="tersedia">Tersedia</option>
                      <option value="terjual">Terjual</option>
                      <option value="dalam_perbaikan">Dalam Perbaikan</option>
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div className="filter-group">
                    <label className="filter-label">Filter Bulan</label>
                    <select
                      value={filterBulan}
                      onChange={(e) => setFilterBulan(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Semua Bulan</option>
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div className="filter-group">
                    <label className="filter-label">Tahun</label>
                    <select
                      value={filterTahun}
                      onChange={(e) => setFilterTahun(e.target.value)}
                      className="filter-select"
                    >
                      {tahunOptions.map(year => (
                        <option key={year} value={year}>
                          {year === 'all' ? 'Semua Tahun' : year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="filter-group filter-actions">
                    <label className="filter-label">&nbsp;</label>
                    <div className="action-buttons">
                      <button
                        onClick={handleSearch}
                        className="btn btn-secondary"
                      >
                        Terapkan Filter
                      </button>
                      <button
                        onClick={resetFilters}
                        className="btn btn-outline"
                      >
                        Reset Semua
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Info */}
                <div className="filter-info">
                  Menampilkan {filteredMotors.length} dari {motors.length} motor
                  {filterStatus !== 'all' && ` • Status: ${getStatusName(filterStatus)}`}
                  {filterBulan && ` • Bulan: ${getBulanName(parseInt(filterBulan))}`}
                  {filterTahun !== 'all' && ` • Tahun: ${filterTahun}`}
                  {filterTahun === 'all' && ` • Tahun: Semua Tahun`}
                  {searchQuery && ` • Pencarian: "${searchQuery}"`}
                </div>
              </div>
            </div>

            {/* Motor List */}
            <div className="table-container">
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Motor</th>
                        <th className="table-header-cell">Nomor Polisi</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Harga</th>
                        <th className="table-header-cell">Tanggal Masuk</th>
                        <th className="table-header-cell">Tanggal Keluar</th>
                        <th className="table-header-cell table-header-cell-actions">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {filteredMotors.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-state">
                            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="empty-text">
                              {motors.length === 0
                                ? 'Tidak ada data motor'
                                : 'Tidak ada data yang sesuai dengan filter'
                              }
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredMotors.map((motor) => (
                          <tr key={motor.id} className="table-row">
                            <td className="table-cell">
                              <div>
                                <div className="motor-name">{motor.nama_motor}</div>
                                <div className="motor-id">ID: {motor.id}</div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="license-plate">{motor.nomor_polisi}</div>
                            </td>
                            <td className="table-cell">
                              <div className="status-container">
                                {getStatusBadge(motor.status)}
                                <select
                                  value={motor.status}
                                  onChange={(e) => updateStatus(motor.id, e.target.value)}
                                  className="status-select"
                                >
                                  <option value="tersedia">Tersedia</option>
                                  <option value="terjual">Terjual</option>
                                  <option value="dalam_perbaikan">Perbaikan</option>
                                </select>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div className="price">
                                {formatCurrency(motor.harga)}
                              </div>
                            </td>
                            <td className="table-cell date">
                              {formatDate(motor.tanggal_masuk)}
                            </td>
                            <td className="table-cell date">
                              {motor.tanggal_keluar ? (
                                <strong className="tanggal-keluar">{formatDate(motor.tanggal_keluar)}</strong>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="table-cell actions">
                              <button
                                onClick={() => handleEdit(motor)}
                                className="btn-action btn-edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(motor.id)}
                                className="btn-action btn-delete"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <PendapatanBulanan />
        )}
      </div>

      {/* Add/Edit Motor Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editing ? 'Edit Motor' : 'Tambah Motor Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  Nama Motor *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_motor}
                  onChange={(e) => setFormData({ ...formData, nama_motor: e.target.value })}
                  className="form-input"
                  placeholder="Masukkan nama motor"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Nomor Polisi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomor_polisi}
                  onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value })}
                  className="form-input"
                  placeholder="Masukkan nomor polisi"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  <option value="tersedia">Tersedia</option>
                  <option value="terjual">Terjual</option>
                  <option value="dalam_perbaikan">Dalam Perbaikan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Harga *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={formData.harga}
                  onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                  className="form-input"
                  placeholder="Masukkan harga"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Tanggal Masuk *
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_masuk}
                  onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Menyimpan...' : (editing ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;