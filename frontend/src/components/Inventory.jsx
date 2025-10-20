import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Search, RefreshCw, Eye } from 'lucide-react';
import { GetMotors, SearchMotors, GetMotorsByStatus, CheckNomorPolisiExists, AddMotor, UpdateMotor, DeleteMotor } from '../../wailsjs/go/main/App';
import { AlertModal, ConfirmModal } from './Modal';
import MotorDetail from './MotorDetail';
import './Inventory.css';

// Constants
const STATUS_OPTIONS = [
  { value: 'baru_masuk', label: 'Baru Masuk', color: '#6366f1' },
  { value: 'tersedia', label: 'Tersedia', color: '#F4991A' },
  { value: 'terjual', label: 'Terjual', color: '#059669' },
  { value: 'dalam_perbaikan', label: 'Perbaikan', color: '#D97706' }
];

// Generate year options for Tahun Motor (1980 - current year + 1)
const generateMotorYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 1980;
  const endYear = currentYear + 1;
  const years = [];

  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }

  return years;
};

// Generate year options for Pajak Date (current year - 5 to current year + 10)
const generatePajakYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 5;
  const endYear = currentYear + 10;
  const years = [];

  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }

  return years;
};

// Utility function untuk format currency
const formatCurrency = (value) => {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Utility function untuk format input harga realtime
const formatHargaInput = (value) => {
  if (!value) return '';
  // Remove all non-digit characters
  const numValue = value.replace(/\D/g, '');
  // Format dengan Intl NumberFormat
  if (numValue) {
    return new Intl.NumberFormat('id-ID').format(parseInt(numValue));
  }
  return '';
};

// Utility function untuk parse harga dari formatted string
const parseHarga = (value) => {
  return parseInt(value.replace(/\D/g, '')) || 0;
};

// Utility function untuk format tanggal (remove timestamp)
const formatTanggal = (dateString) => {
  if (!dateString) return '-';
  // Extract date part only (YYYY-MM-DD) from ISO string
  return dateString.split('T')[0];
};

// Utility function untuk validasi dan format nomor polisi
const formatNomorPolisi = (value) => {
  // Remove special characters, hanya huruf, angka, dan spasi
  const cleaned = value.replace(/[^A-Z0-9\s]/gi, '');
  // Convert to uppercase
  return cleaned.toUpperCase();
};

// Helper function untuk filter berdasarkan date range
const isDateInRange = (dateString, startDate, endDate) => {
  if (!dateString) return false;
  if (!startDate && !endDate) return true;

  const date = new Date(dateString);
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  // Set time to start/end of day for accurate comparison
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  date.setHours(0, 0, 0, 0);

  if (start && end) {
    return date >= start && date <= end;
  } else if (start) {
    return date >= start;
  } else if (end) {
    return date <= end;
  }
  return true;
};

export default function Inventory() {
  const [filteredMotors, setFilteredMotors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  // Separate date filters for tanggal_masuk and tanggal_keluar
  const [tanggalMasukStart, setTanggalMasukStart] = useState('');
  const [tanggalMasukEnd, setTanggalMasukEnd] = useState('');
  const [tanggalKeluarStart, setTanggalKeluarStart] = useState('');
  const [tanggalKeluarEnd, setTanggalKeluarEnd] = useState('');
  // Shortcut filters
  const [tanggalMasukShortcut, setTanggalMasukShortcut] = useState('');
  const [tanggalKeluarShortcut, setTanggalKeluarShortcut] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingMotor, setEditingMotor] = useState(null);
  const [nomorPolisiError, setNomorPolisiError] = useState('');
  const [checkingNomorPolisi, setCheckingNomorPolisi] = useState(false);
  const [formData, setFormData] = useState({
    nama_motor: '',
    nomor_polisi: '',
    status: 'baru_masuk',
    harga_modal: '',
    harga: '',
    warna: '',
    tahun_motor: '',
    pajak_date: '',
    nama_penjual: '',
    telepon_penjual: '',
    alamat_penjual: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    tanggal_keluar: '',
  });

  // Alert & Confirm Modal States
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'success', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });

  // Detail View State
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMotorId, setSelectedMotorId] = useState(null);

  const itemsPerPage = 10;
  const searchTimeoutRef = useRef(null);
  const nomorPolisiTimeoutRef = useRef(null);

  useEffect(() => {
    loadMotors();
  }, []);

  // Debounced effect untuk search dan filter - panggil backend API
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout untuk debouncing (300ms)
    searchTimeoutRef.current = setTimeout(() => {
      loadMotors();
    }, 300);

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, statusFilter, tanggalMasukStart, tanggalMasukEnd, tanggalKeluarStart, tanggalKeluarEnd]);

  const loadMotors = async () => {
    try {
      setLoading(true);

      // Check if Wails is ready
      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadMotors, 500);
        return;
      }

      let response;

      // Priority: Search > Status Filter > All
      if (searchTerm.trim()) {
        // Use backend search API
        response = await SearchMotors(searchTerm.trim());
      } else if (statusFilter !== 'semua') {
        // Use backend filter by status API
        response = await GetMotorsByStatus(statusFilter);
      } else {
        // Get all motors
        response = await GetMotors();
      }

      if (response.success) {
        let motors = response.data || [];

        // Apply date range filters di frontend - SEPARATE untuk tanggal_masuk dan tanggal_keluar
        if (tanggalMasukStart || tanggalMasukEnd || tanggalKeluarStart || tanggalKeluarEnd) {
          motors = motors.filter(motor => {
            let passFilter = true;

            // Filter berdasarkan tanggal_masuk (apply untuk semua motor)
            if (tanggalMasukStart || tanggalMasukEnd) {
              passFilter = passFilter && isDateInRange(motor.tanggal_masuk, tanggalMasukStart, tanggalMasukEnd);
            }

            // Filter berdasarkan tanggal_keluar (hanya untuk motor yang sudah ada tanggal_keluar)
            if (tanggalKeluarStart || tanggalKeluarEnd) {
              // Jika motor tidak punya tanggal_keluar, filter ini akan exclude motor tersebut
              if (!motor.tanggal_keluar) {
                passFilter = false;
              } else {
                passFilter = passFilter && isDateInRange(motor.tanggal_keluar, tanggalKeluarStart, tanggalKeluarEnd);
              }
            }

            return passFilter;
          });
        }

        setFilteredMotors(motors);
      } else {
        console.error('Error from backend:', response.message);
        setFilteredMotors([]);
      }

      // Reset to first page when data changes
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading motors:', error);
      setFilteredMotors([]);
    } finally {
      setLoading(false);
    }
  };

  // Validation function untuk check duplicate nomor polisi
  const checkNomorPolisiDuplicate = async (nomorPolisi) => {
    if (!nomorPolisi.trim()) {
      setNomorPolisiError('');
      return;
    }

    setCheckingNomorPolisi(true);
    try {
      const excludeID = editingMotor ? editingMotor.id : '';
      const response = await CheckNomorPolisiExists(nomorPolisi.trim(), excludeID);

      if (response.success && response.data.exists) {
        setNomorPolisiError(`Nomor polisi '${nomorPolisi}' sudah terdaftar`);
      } else {
        setNomorPolisiError('');
      }
    } catch (error) {
      console.error('Error checking nomor polisi:', error);
      setNomorPolisiError('');
    } finally {
      setCheckingNomorPolisi(false);
    }
  };

  // Debounced nomor polisi validation dengan auto uppercase
  const handleNomorPolisiChange = (value) => {
    const formatted = formatNomorPolisi(value);
    setFormData({ ...formData, nomor_polisi: formatted });

    // Clear previous timeout
    if (nomorPolisiTimeoutRef.current) {
      clearTimeout(nomorPolisiTimeoutRef.current);
    }

    // Set new timeout untuk debouncing (500ms)
    nomorPolisiTimeoutRef.current = setTimeout(() => {
      checkNomorPolisiDuplicate(formatted);
    }, 500);
  };

  // Handle refresh - reset semua filter dan reload data
  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('semua');
    setTanggalMasukStart('');
    setTanggalMasukEnd('');
    setTanggalKeluarStart('');
    setTanggalKeluarEnd('');
    setTanggalMasukShortcut('');
    setTanggalKeluarShortcut('');
    setCurrentPage(1);
    loadMotors();
  };

  // Handle shortcut filter untuk Tanggal Masuk
  const handleTanggalMasukShortcut = (shortcut) => {
    setTanggalMasukShortcut(shortcut);
    const today = new Date();

    // Reset filter Tanggal Keluar (mutual exclusive)
    setTanggalKeluarStart('');
    setTanggalKeluarEnd('');
    setTanggalKeluarShortcut('');

    if (shortcut === 'hari-ini') {
      const todayStr = today.toISOString().split('T')[0];
      setTanggalMasukStart(todayStr);
      setTanggalMasukEnd(todayStr);
    } else if (shortcut === 'bulan-ini') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setTanggalMasukStart(firstDay.toISOString().split('T')[0]);
      setTanggalMasukEnd(lastDay.toISOString().split('T')[0]);
    } else {
      // Reset jika pilih "Pilih Shortcut"
      setTanggalMasukStart('');
      setTanggalMasukEnd('');
    }
  };

  // Handle shortcut filter untuk Tanggal Keluar
  const handleTanggalKeluarShortcut = (shortcut) => {
    setTanggalKeluarShortcut(shortcut);
    const today = new Date();

    // Reset filter Tanggal Masuk (mutual exclusive)
    setTanggalMasukStart('');
    setTanggalMasukEnd('');
    setTanggalMasukShortcut('');

    if (shortcut === 'hari-ini') {
      const todayStr = today.toISOString().split('T')[0];
      setTanggalKeluarStart(todayStr);
      setTanggalKeluarEnd(todayStr);
    } else if (shortcut === 'bulan-ini') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setTanggalKeluarStart(firstDay.toISOString().split('T')[0]);
      setTanggalKeluarEnd(lastDay.toISOString().split('T')[0]);
    } else {
      // Reset jika pilih "Pilih Shortcut"
      setTanggalKeluarStart('');
      setTanggalKeluarEnd('');
    }
  };

  const handleAddMotor = async (e) => {
    e.preventDefault();

    // Check for duplicate nomor polisi error
    if (nomorPolisiError) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Tidak dapat menambahkan motor: ' + nomorPolisiError
      });
      return;
    }

    try {
      const hargaModal = parseHarga(formData.harga_modal);
      const harga = parseHarga(formData.harga);
      const response = await AddMotor(
        formData.nama_motor,
        formData.nomor_polisi,
        formData.status,
        hargaModal,
        harga,
        formData.warna,
        formData.tahun_motor,
        formData.pajak_date,
        formData.nama_penjual,
        formData.telepon_penjual,
        formData.alamat_penjual,
        formData.tanggal_masuk
      );

      if (response.success) {
        setShowModal(false);
        resetForm();
        loadMotors();
        // Show success alert
        setAlertModal({
          isOpen: true,
          type: 'success',
          message: `Motor ${formData.nama_motor} berhasil ditambahkan!`
        });
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: response.message || 'Gagal menambahkan motor'
        });
      }
    } catch (error) {
      console.error('Error adding motor:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Terjadi kesalahan saat menambahkan motor'
      });
    }
  };

  const handleUpdateMotor = async (e) => {
    e.preventDefault();

    // Check for duplicate nomor polisi error
    if (nomorPolisiError) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Tidak dapat mengupdate motor: ' + nomorPolisiError
      });
      return;
    }

    try {
      const hargaModal = parseHarga(formData.harga_modal);
      const harga = parseHarga(formData.harga);
      const response = await UpdateMotor(
        editingMotor.id,
        formData.nama_motor,
        formData.nomor_polisi,
        formData.status,
        hargaModal,
        harga,
        formData.warna,
        formData.tahun_motor,
        formData.pajak_date,
        formData.nama_penjual,
        formData.telepon_penjual,
        formData.alamat_penjual,
        formData.tanggal_masuk,
        formData.tanggal_keluar
      );

      if (response.success) {
        setShowModal(false);
        resetForm();
        loadMotors();
        // Show success alert
        setAlertModal({
          isOpen: true,
          type: 'success',
          message: `Motor ${formData.nama_motor} berhasil diupdate!`
        });
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          message: response.message || 'Gagal mengupdate motor'
        });
      }
    } catch (error) {
      console.error('Error updating motor:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        message: 'Terjadi kesalahan saat mengupdate motor'
      });
    }
  };

  const handleDeleteMotor = (id, namaMotor) => {
    setConfirmModal({
      isOpen: true,
      message: `Apakah Anda yakin ingin menghapus motor "${namaMotor}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          const response = await DeleteMotor(id);
          if (response.success) {
            loadMotors();
            setAlertModal({
              isOpen: true,
              type: 'success',
              message: `Motor ${namaMotor} berhasil dihapus!`
            });
          } else {
            setAlertModal({
              isOpen: true,
              type: 'error',
              message: response.message || 'Gagal menghapus motor'
            });
          }
        } catch (error) {
          console.error('Error deleting motor:', error);
          setAlertModal({
            isOpen: true,
            type: 'error',
            message: 'Terjadi kesalahan saat menghapus motor'
          });
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      nama_motor: '',
      nomor_polisi: '',
      status: 'baru_masuk',
      harga_modal: '',
      harga: '',
      warna: '',
      tahun_motor: '',
      pajak_date: '',
      tanggal_masuk: new Date().toISOString().split('T')[0],
      tanggal_keluar: '',
    });
    setEditingMotor(null);
    setNomorPolisiError('');
    setCheckingNomorPolisi(false);

    // Clear any pending timeouts
    if (nomorPolisiTimeoutRef.current) {
      clearTimeout(nomorPolisiTimeoutRef.current);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (motor) => {
    setEditingMotor(motor);
    setFormData({
      nama_motor: motor.nama_motor,
      nomor_polisi: motor.nomor_polisi,
      status: motor.status,
      harga_modal: formatHargaInput(motor.harga_modal?.toString() || '0'),
      harga: formatHargaInput(motor.harga.toString()),
      warna: motor.warna || '',
      tahun_motor: motor.tahun_motor || '',
      pajak_date: motor.pajak_date || '',
      nama_penjual: motor.nama_penjual || '',
      telepon_penjual: motor.telepon_penjual || '',
      alamat_penjual: motor.alamat_penjual || '',
      tanggal_masuk: formatTanggal(motor.tanggal_masuk),
      tanggal_keluar: formatTanggal(motor.tanggal_keluar) !== '-' ? formatTanggal(motor.tanggal_keluar) : '',
    });
    setShowModal(true);
  };

  // Smart Pagination Logic
  const totalPages = Math.ceil(filteredMotors.length / itemsPerPage);
  const getPaginationButtons = () => {
    const buttons = [];
    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      // Show 1, some middle pages, and last page
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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMotors = filteredMotors.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status);
    return statusObj || STATUS_OPTIONS[0];
  };

  const handleViewDetail = (motorId) => {
    setSelectedMotorId(motorId);
    setShowDetail(true);
  };

  // Render Detail Page if selected
  if (showDetail && selectedMotorId) {
    return <MotorDetail motorId={selectedMotorId} onBack={() => setShowDetail(false)} />;
  }

  if (loading) {
    return (
      <div className="inventory-loading">
        <div className="inventory-loading-content">
          <div className="inventory-loading-spinner"></div>
          <p className="inventory-loading-text">Memuat data motor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      {/* Header Actions */}
      <div className="inventory-header">
        <div className="inventory-search-filters">
          <div className="inventory-search">
            <div className="inventory-search-wrapper">
              <div className="inventory-search-icon">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Cari motor atau nomor polisi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="inventory-search-input"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="inventory-filter-select"
          >
            <option value="semua">Semua Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {/* Tanggal Masuk (Beli) Filter */}
          <div className="inventory-date-filter-group">
            <label className="inventory-date-filter-label">Tgl Masuk (Beli):</label>
            <div className="inventory-date-filter-controls">
              <div className="inventory-date-filter-inputs">
                <input
                  type="date"
                  value={tanggalMasukStart}
                  onChange={(e) => {
                    setTanggalMasukStart(e.target.value);
                    setTanggalMasukShortcut(''); // Reset shortcut saat manual input
                    // Reset filter Tanggal Keluar (mutual exclusive)
                    setTanggalKeluarStart('');
                    setTanggalKeluarEnd('');
                    setTanggalKeluarShortcut('');
                  }}
                  className="inventory-filter-date"
                  placeholder="Dari"
                  title="Tanggal Masuk - Dari"
                  disabled={tanggalKeluarStart || tanggalKeluarEnd}
                />
                <span className="inventory-date-separator">-</span>
                <input
                  type="date"
                  value={tanggalMasukEnd}
                  onChange={(e) => {
                    setTanggalMasukEnd(e.target.value);
                    setTanggalMasukShortcut(''); // Reset shortcut saat manual input
                    // Reset filter Tanggal Keluar (mutual exclusive)
                    setTanggalKeluarStart('');
                    setTanggalKeluarEnd('');
                    setTanggalKeluarShortcut('');
                  }}
                  className="inventory-filter-date"
                  placeholder="Sampai"
                  title="Tanggal Masuk - Sampai"
                  disabled={tanggalKeluarStart || tanggalKeluarEnd}
                />
              </div>
              <select
                value={tanggalMasukShortcut}
                onChange={(e) => handleTanggalMasukShortcut(e.target.value)}
                className="inventory-date-shortcut-select"
                disabled={tanggalKeluarStart || tanggalKeluarEnd}
              >
                <option value="">Shortcut</option>
                <option value="hari-ini">Hari Ini</option>
                <option value="bulan-ini">Bulan Ini</option>
              </select>
            </div>
          </div>

          {/* Tanggal Keluar (Jual) Filter */}
          <div className="inventory-date-filter-group">
            <label className="inventory-date-filter-label">Tgl Keluar (Jual):</label>
            <div className="inventory-date-filter-controls">
              <div className="inventory-date-filter-inputs">
                <input
                  type="date"
                  value={tanggalKeluarStart}
                  onChange={(e) => {
                    setTanggalKeluarStart(e.target.value);
                    setTanggalKeluarShortcut(''); // Reset shortcut saat manual input
                    // Reset filter Tanggal Masuk (mutual exclusive)
                    setTanggalMasukStart('');
                    setTanggalMasukEnd('');
                    setTanggalMasukShortcut('');
                  }}
                  className="inventory-filter-date"
                  placeholder="Dari"
                  title="Tanggal Keluar - Dari"
                  disabled={tanggalMasukStart || tanggalMasukEnd}
                />
                <span className="inventory-date-separator">-</span>
                <input
                  type="date"
                  value={tanggalKeluarEnd}
                  onChange={(e) => {
                    setTanggalKeluarEnd(e.target.value);
                    setTanggalKeluarShortcut(''); // Reset shortcut saat manual input
                    // Reset filter Tanggal Masuk (mutual exclusive)
                    setTanggalMasukStart('');
                    setTanggalMasukEnd('');
                    setTanggalMasukShortcut('');
                  }}
                  className="inventory-filter-date"
                  placeholder="Sampai"
                  title="Tanggal Keluar - Sampai"
                  disabled={tanggalMasukStart || tanggalMasukEnd}
                />
              </div>
              <select
                value={tanggalKeluarShortcut}
                onChange={(e) => handleTanggalKeluarShortcut(e.target.value)}
                className="inventory-date-shortcut-select"
                disabled={tanggalMasukStart || tanggalMasukEnd}
              >
                <option value="">Shortcut</option>
                <option value="hari-ini">Hari Ini</option>
                <option value="bulan-ini">Bulan Ini</option>
              </select>
            </div>
          </div>

          <button onClick={handleRefresh} className="inventory-refresh-btn" title="Refresh & Reset Filter">
            Refresh
          </button>
        </div>

        <div className="inventory-controls">
          <button onClick={openAddModal} className="inventory-add-btn">
            <Plus size={20} />
            Tambah Data
          </button>
        </div>
      </div>

      {/* Table with Horizontal Scroll */}
      <div className="inventory-table-card">
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead className="inventory-table-head">
              <tr>
                <th className="inventory-table-th inventory-table-th-no">No</th>
                <th className="inventory-table-th">Nama Motor</th>
                <th className="inventory-table-th">Nomor Polisi</th>
                <th className="inventory-table-th">Status</th>
                <th className="inventory-table-th">Harga</th>
                <th className="inventory-table-th">Tgl Masuk</th>
                <th className="inventory-table-th">Tgl Keluar</th>
                <th className="inventory-table-th">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMotors.length > 0 ? (
                paginatedMotors.map((motor, idx) => {
                  const statusBadge = getStatusBadge(motor.status);
                  const rowNumber = startIndex + idx + 1;
                  const isAlternate = idx % 2 === 1;
                  return (
                    <tr
                      key={motor.id}
                      className={`inventory-table-body-row ${
                        isAlternate ? 'inventory-table-body-row-alternate' : ''
                      }`}
                    >
                      <td className="inventory-table-td inventory-table-td-no inventory-table-td-muted">{rowNumber}</td>
                      <td className="inventory-table-td inventory-table-td-primary">{motor.nama_motor}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.nomor_polisi}</td>
                      <td className="inventory-table-td">
                        <span className="inventory-status-badge" style={{ backgroundColor: `${statusBadge.color}15`, color: statusBadge.color }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="inventory-table-td inventory-table-price">{formatCurrency(motor.harga)}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{formatTanggal(motor.tanggal_masuk)}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{formatTanggal(motor.tanggal_keluar)}</td>
                      <td className={`inventory-table-td inventory-table-td-aksi ${isAlternate ? 'inventory-table-td-aksi-alternate' : ''}`}>
                        <div className="inventory-actions">
                          <button
                            onClick={() => handleViewDetail(motor.id)}
                            className="inventory-action-btn inventory-action-btn-view"
                            title="Lihat Detail"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(motor)}
                            className="inventory-action-btn inventory-action-btn-edit"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMotor(motor.id, motor.nama_motor)}
                            className="inventory-action-btn inventory-action-btn-delete"
                            title="Hapus"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="inventory-no-data">
                    Tidak ada data motor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Pagination */}
        {totalPages > 1 && (
          <div className="inventory-pagination-wrapper">
            <div className="inventory-pagination-info">
              Menampilkan {startIndex + 1} hingga {Math.min(startIndex + itemsPerPage, filteredMotors.length)} dari {filteredMotors.length} data
            </div>
            <div className="inventory-pagination-controls">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inventory-pagination-btn"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="inventory-pagination-numbers">
                {getPaginationButtons().map((page, idx) => (
                  page === '...' ? (
                    <span key={idx} className="inventory-pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(page)}
                      className={`inventory-pagination-number ${currentPage === page ? 'inventory-pagination-number-active' : ''}`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inventory-pagination-btn"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="inventory-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="inventory-modal-title">
              {editingMotor ? 'Edit Data Motor' : 'Tambah Motor Baru'}
            </h2>
            <p className="inventory-modal-description">
              {editingMotor
                ? 'Perbarui informasi motor yang sudah ada di inventory'
                : 'Lengkapi form di bawah untuk menambahkan motor baru ke inventory Anda'}
            </p>
            <form onSubmit={editingMotor ? handleUpdateMotor : handleAddMotor}>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Nama Motor *</label>
                <input
                  type="text"
                  value={formData.nama_motor}
                  onChange={(e) => setFormData({ ...formData, nama_motor: e.target.value })}
                  className="inventory-form-input"
                  placeholder="Contoh: Honda CB150R"
                  required
                />
                <span className="inventory-form-helper-text">Masukkan merk dan tipe motor</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Nomor Polisi *</label>
                <input
                  type="text"
                  value={formData.nomor_polisi}
                  onChange={(e) => handleNomorPolisiChange(e.target.value)}
                  className={`inventory-form-input ${nomorPolisiError ? 'inventory-form-input-error' : ''}`}
                  placeholder="Contoh: B 1234 ABC"
                  required
                />
                {!checkingNomorPolisi && !nomorPolisiError && !formData.nomor_polisi && (
                  <span className="inventory-form-helper-text">Format huruf dan angka, otomatis kapital</span>
                )}
                {checkingNomorPolisi && (
                  <span className="inventory-form-helper-text inventory-form-checking">
                    Mengecek nomor polisi...
                  </span>
                )}
                {nomorPolisiError && !checkingNomorPolisi && (
                  <span className="inventory-form-helper-text inventory-form-error-text">
                    {nomorPolisiError}
                  </span>
                )}
                {!nomorPolisiError && !checkingNomorPolisi && formData.nomor_polisi && (
                  <span className="inventory-form-helper-text inventory-form-success-text">
                    ✓ Nomor polisi tersedia
                  </span>
                )}
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Harga Modal (Beli) *</label>
                <div className="inventory-form-harga-wrapper">
                  <span className="inventory-form-harga-prefix">Rp</span>
                  <input
                    type="text"
                    value={formData.harga_modal}
                    onChange={(e) => setFormData({ ...formData, harga_modal: formatHargaInput(e.target.value) })}
                    className="inventory-form-input inventory-form-harga-input"
                    placeholder="0"
                    required
                  />
                </div>
                <span className="inventory-form-helper-text">Harga saat membeli motor ini</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Harga Jual</label>
                <div className="inventory-form-harga-wrapper">
                  <span className="inventory-form-harga-prefix">Rp</span>
                  <input
                    type="text"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: formatHargaInput(e.target.value) })}
                    className="inventory-form-input inventory-form-harga-input"
                    placeholder="0"
                  />
                </div>
                <span className="inventory-form-helper-text">Harga jual kepada customer (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Warna</label>
                <input
                  type="text"
                  value={formData.warna}
                  onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                  className="inventory-form-input"
                  placeholder="Contoh: Merah"
                />
                <span className="inventory-form-helper-text">Warna motor (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Tahun Motor *</label>
                <select
                  value={formData.tahun_motor}
                  onChange={(e) => setFormData({ ...formData, tahun_motor: e.target.value })}
                  className="inventory-form-select"
                  required
                >
                  <option value="">Pilih Tahun Motor</option>
                  {generateMotorYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <span className="inventory-form-helper-text">Tahun produksi/release motor</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Pajak Date (Tahun)</label>
                <select
                  value={formData.pajak_date}
                  onChange={(e) => setFormData({ ...formData, pajak_date: e.target.value })}
                  className="inventory-form-select"
                >
                  <option value="">Pilih Tahun Pajak</option>
                  {generatePajakYearOptions().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <span className="inventory-form-helper-text">Tahun pajak (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Nama Penjual</label>
                <input
                  type="text"
                  value={formData.nama_penjual}
                  onChange={(e) => setFormData({ ...formData, nama_penjual: e.target.value })}
                  className="inventory-form-input"
                  placeholder="Contoh: Toko Motor Jaya / Budi Santoso"
                />
                <span className="inventory-form-helper-text">Nama toko/perorangan yang menjual motor (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">No. Telepon Penjual</label>
                <input
                  type="text"
                  value={formData.telepon_penjual}
                  onChange={(e) => setFormData({ ...formData, telepon_penjual: e.target.value })}
                  className="inventory-form-input"
                  placeholder="Contoh: 081234567890"
                />
                <span className="inventory-form-helper-text">Nomor telepon penjual (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Alamat Penjual</label>
                <textarea
                  value={formData.alamat_penjual}
                  onChange={(e) => setFormData({ ...formData, alamat_penjual: e.target.value })}
                  className="inventory-form-input"
                  placeholder="Contoh: Jl. Raya Motor No. 123, Jakarta"
                  rows="3"
                />
                <span className="inventory-form-helper-text">Alamat lengkap penjual (opsional)</span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="inventory-form-select"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <span className="inventory-form-helper-text">
                  {formData.status === 'baru_masuk' && 'Motor baru masuk, belum siap jual'}
                  {formData.status === 'tersedia' && 'Motor siap dijual'}
                  {formData.status === 'terjual' && 'Motor sudah terjual'}
                  {formData.status === 'dalam_perbaikan' && 'Motor sedang dalam perbaikan/service'}
                </span>
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Tanggal Masuk *</label>
                <input
                  type="date"
                  value={formData.tanggal_masuk}
                  onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Tanggal Keluar</label>
                <input
                  type="date"
                  value={formData.tanggal_keluar}
                  onChange={(e) => setFormData({ ...formData, tanggal_keluar: e.target.value })}
                  className="inventory-form-input"
                />
              </div>

              <div className="inventory-form-buttons">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inventory-form-btn inventory-form-btn-cancel"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inventory-form-btn inventory-form-btn-submit"
                  disabled={nomorPolisiError || checkingNomorPolisi}
                >
                  {editingMotor ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        message={alertModal.message}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        message={confirmModal.message}
        title="Konfirmasi Hapus"
        confirmText="Hapus"
        type="danger"
      />
    </div>
  );
}
