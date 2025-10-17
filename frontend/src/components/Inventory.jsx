import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Search, Zap } from 'lucide-react';
import { GetMotors, SearchMotors, AddMotor, UpdateMotor, DeleteMotor } from '../../wailsjs/go/main/App';
import './Inventory.css';

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
    status: 'tersedia',
    harga: '',
    tanggal_masuk: new Date().toISOString().split('T')[0],
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
      const response = await AddMotor(
        formData.nama_motor,
        formData.nomor_polisi,
        formData.status,
        parseFloat(formData.harga),
        formData.tanggal_masuk
      );

      if (response.success) {
        setShowModal(false);
        setFormData({
          nama_motor: '',
          nomor_polisi: '',
          status: 'tersedia',
          harga: '',
          tanggal_masuk: new Date().toISOString().split('T')[0],
        });
        loadMotors();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error adding motor:', error);
      alert('Gagal menambahkan motor');
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

  const getStatusBadge = (status) => {
    const badges = {
      tersedia: 'bg-primary/10 text-primary',
      terjual: 'bg-green-100 text-green-700',
      dalam_perbaikan: 'bg-yellow-100 text-yellow-700',
    };
    const labels = {
      tersedia: 'Tersedia',
      terjual: 'Terjual',
      dalam_perbaikan: 'Perbaikan',
    };
    return { badge: badges[status], label: labels[status] };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Pagination
  const totalPages = Math.ceil(filteredMotors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMotors = filteredMotors.slice(startIndex, startIndex + itemsPerPage);

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
            <option value="tersedia">Tersedia</option>
            <option value="terjual">Terjual</option>
            <option value="dalam_perbaikan">Perbaikan</option>
          </select>

          <button
            onClick={() => {
              setEditingMotor(null);
              setFormData({
                nama_motor: '',
                nomor_polisi: '',
                status: 'tersedia',
                harga: '',
                tanggal_masuk: new Date().toISOString().split('T')[0],
              });
              setShowModal(true);
            }}
            className="inventory-add-btn"
          >
            <Plus size={20} />
            Tambah Motor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="inventory-table-card">
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead className="inventory-table-head">
              <tr>
                <th className="inventory-table-th">Nama Motor</th>
                <th className="inventory-table-th">Nomor Polisi</th>
                <th className="inventory-table-th">Status</th>
                <th className="inventory-table-th">Harga</th>
                <th className="inventory-table-th">Tanggal Masuk</th>
                <th className="inventory-table-th">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMotors.length > 0 ? (
                paginatedMotors.map((motor) => {
                  const statusClass = `inventory-status-${motor.status}`;
                  const labels = {
                    tersedia: 'Tersedia',
                    terjual: 'Terjual',
                    dalam_perbaikan: 'Perbaikan',
                  };
                  return (
                    <tr key={motor.id} className="inventory-table-body-row">
                      <td className="inventory-table-td inventory-table-td-primary">{motor.nama_motor}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.nomor_polisi}</td>
                      <td className="inventory-table-td">
                        <span className={`inventory-status-badge ${statusClass}`}>
                          {labels[motor.status]}
                        </span>
                      </td>
                      <td className="inventory-table-td inventory-table-price">{formatCurrency(motor.harga)}</td>
                      <td className="inventory-table-td inventory-table-td-muted">{motor.tanggal_masuk}</td>
                      <td className="inventory-table-td">
                        <div className="inventory-actions">
                          <button
                            onClick={() => {
                              setEditingMotor(motor);
                              setFormData({
                                nama_motor: motor.nama_motor,
                                nomor_polisi: motor.nomor_polisi,
                                status: motor.status,
                                harga: motor.harga.toString(),
                                tanggal_masuk: motor.tanggal_masuk,
                              });
                              setShowModal(true);
                            }}
                            className="inventory-action-btn inventory-action-btn-edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteMotor(motor.id)}
                            className="inventory-action-btn inventory-action-btn-delete"
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
                  <td colSpan="6" className="inventory-no-data">
                    Tidak ada data motor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
              >
                <ChevronLeft size={18} />
              </button>
              <div className="inventory-pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`inventory-pagination-number ${currentPage === page ? 'inventory-pagination-number-active' : ''}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inventory-pagination-btn"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="inventory-modal-overlay">
          <div className="inventory-modal">
            <h2 className="inventory-modal-title">
              {editingMotor ? 'Edit Motor' : 'Tambah Motor Baru'}
            </h2>
            <form onSubmit={handleAddMotor}>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Nama Motor</label>
                <input
                  type="text"
                  value={formData.nama_motor}
                  onChange={(e) => setFormData({ ...formData, nama_motor: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Nomor Polisi</label>
                <input
                  type="text"
                  value={formData.nomor_polisi}
                  onChange={(e) => setFormData({ ...formData, nomor_polisi: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Harga</label>
                <input
                  type="number"
                  value={formData.harga}
                  onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                  className="inventory-form-input"
                  required
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="inventory-form-select"
                >
                  <option value="tersedia">Tersedia</option>
                  <option value="terjual">Terjual</option>
                  <option value="dalam_perbaikan">Perbaikan</option>
                </select>
              </div>
              <div className="inventory-form-group">
                <label className="inventory-form-label">Tanggal Masuk</label>
                <input
                  type="date"
                  value={formData.tanggal_masuk}
                  onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                  className="inventory-form-input"
                  required
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
