import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Search, Zap } from 'lucide-react';
import { GetMotors, SearchMotors, AddMotor, UpdateMotor, DeleteMotor } from '../../wailsjs/go/main/App';
import './Inventory.css';

// Constants
const STATUS_OPTIONS = [
  { value: 'baru_masuk', label: 'Baru Masuk', color: '#6366f1' },
  { value: 'tersedia', label: 'Tersedia', color: '#F4991A' },
  { value: 'terjual', label: 'Terjual', color: '#059669' },
  { value: 'dalam_perbaikan', label: 'Perbaikan', color: '#D97706' }
];

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

export default function Inventory() {
  const [motors, setMotors] = useState([]);
  const [filteredMotors, setFilteredMotors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingMotor, setEditingMotor] = useState(null);
  const [formData, setFormData] = useState({
    nama_motor: '',
    nomor_polisi: '',
    status: 'baru_masuk',
    harga: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    tanggal_keluar: '',
  });

  const itemsPerPage = 10;

  useEffect(() => {
    loadMotors();
  }, []);

  useEffect(() => {
    filterMotors();
  }, [motors, searchTerm, statusFilter]);

  const loadMotors = async () => {
    try {
      setLoading(true);

      // Check if Wails is ready
      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadMotors, 500);
        return;
      }

      const response = await GetMotors();
      if (response.success) {
        setMotors(response.data || []);
      }
    } catch (error) {
      console.error('Error loading motors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMotors = async () => {
    let filtered = motors;

    // Apply status filter
    if (statusFilter !== 'semua') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.nama_motor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.nomor_polisi.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMotors(filtered);
    setCurrentPage(1);
  };

  const handleAddMotor = async (e) => {
    e.preventDefault();
    try {
      const harga = parseHarga(formData.harga);
      const response = await AddMotor(
        formData.nama_motor,
        formData.nomor_polisi,
        formData.status,
        harga,
        formData.tanggal_masuk
      );

      if (response.success) {
        setShowModal(false);
        resetForm();
        loadMotors();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error adding motor:', error);
      alert('Gagal menambahkan motor');
    }
  };

  const handleUpdateMotor = async (e) => {
    e.preventDefault();
    try {
      const harga = parseHarga(formData.harga);
      const response = await UpdateMotor(
        editingMotor.id,
        formData.nama_motor,
        formData.nomor_polisi,
        formData.status,
        harga,
        formData.tanggal_masuk
      );

      if (response.success) {
        setShowModal(false);
        resetForm();
        loadMotors();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error updating motor:', error);
      alert('Gagal mengupdate motor');
    }
  };

  const handleDeleteMotor = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus motor ini?')) {
      try {
        const response = await DeleteMotor(id);
        if (response.success) {
          loadMotors();
        } else {
          alert(`Error: ${response.message}`);
        }
      } catch (error) {
        console.error('Error deleting motor:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nama_motor: '',
      nomor_polisi: '',
      status: 'baru_masuk',
      harga: '',
      tanggal_masuk: new Date().toISOString().split('T')[0],
      tanggal_keluar: '',
    });
    setEditingMotor(null);
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
      harga: formatHargaInput(motor.harga.toString()),
      tanggal_masuk: motor.tanggal_masuk,
      tanggal_keluar: motor.tanggal_keluar || '',
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

        <div className="inventory-controls">
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

          <button onClick={openAddModal} className="inventory-add-btn">
            <Plus size={20} />
            Tambah Motor
          </button>
        </div>
      </div>

      {/* Table with Horizontal Scroll */}
      <div className="inventory-table-card">
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead className="inventory-table-head">
              <tr>
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
                  return (
                    <tr
                      key={motor.id}
                      className={`inventory-table-body-row ${
                        idx % 2 === 1 ? 'inventory-table-body-row-alternate' : ''
                      }`}
                    >
                      <td className="inventory-table-td inventory-table-td-primary">{motor.nama_motor}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.nomor_polisi}</td>
                      <td className="inventory-table-td">
                        <span className="inventory-status-badge" style={{ backgroundColor: `${statusBadge.color}15`, color: statusBadge.color }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="inventory-table-td inventory-table-price">{formatCurrency(motor.harga)}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.tanggal_masuk}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.tanggal_keluar || '-'}</td>
                      <td className="inventory-table-td">
                        <div className="inventory-actions">
                          <button
                            onClick={() => openEditModal(motor)}
                            className="inventory-action-btn inventory-action-btn-edit"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMotor(motor.id)}
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
                  <td colSpan="7" className="inventory-no-data">
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
              {editingMotor ? 'Edit Motor' : 'Tambah Motor Baru'}
            </h2>
            <form onSubmit={editingMotor ? handleUpdateMotor : handleAddMotor}>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Nama Motor *</label>
                <input
                  type="text"
                  value={formData.nama_motor}
                  onChange={(e) => setFormData({ ...formData, nama_motor: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Nomor Polisi *</label>
                <input
                  type="text"
                  value={formData.nomor_polisi}
                  onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label className="inventory-form-label">Harga *</label>
                <div className="inventory-form-harga-wrapper">
                  <span className="inventory-form-harga-prefix">Rp</span>
                  <input
                    type="text"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: formatHargaInput(e.target.value) })}
                    className="inventory-form-input inventory-form-harga-input"
                    placeholder="0"
                    required
                  />
                  {formData.harga && (
                    <span className="inventory-form-harga-display">{formatCurrency(parseHarga(formData.harga))}</span>
                  )}
                </div>
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
                >
                  {editingMotor ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
