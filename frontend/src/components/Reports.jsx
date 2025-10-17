import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Download, Zap } from 'lucide-react';
import { GetPendapatanBulanan, GetFinancialSummary } from '../../wailsjs/go/main/App';
import './Reports.css';

export default function Reports() {
  const [pendapatanData, setPendapatanData] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Check if Wails is ready
      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadReportData, 500);
        return;
      }

      const [pendResp, finResp] = await Promise.all([
        GetPendapatanBulanan(),
        GetFinancialSummary(),
      ]);

      if (pendResp.success) {
        setPendapatanData(pendResp.data || []);
      }
      if (finResp.success) {
        setFinancialData(finResp.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateTotalRevenue = () => {
    return pendapatanData.reduce((sum, item) => sum + (item.total_penjualan || 0), 0);
  };

  const calculateAverageRevenue = () => {
    if (pendapatanData.length === 0) return 0;
    return calculateTotalRevenue() / pendapatanData.length;
  };

  const getTopMonth = () => {
    if (pendapatanData.length === 0) return null;
    return pendapatanData.reduce((max, item) =>
      (item.total_penjualan > max.total_penjualan) ? item : max
    );
  };

  const topMonth = getTopMonth();
  const totalRevenue = calculateTotalRevenue();
  const averageRevenue = calculateAverageRevenue();

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="reports-loading-content">
          <div className="reports-loading-spinner"></div>
          <p className="reports-loading-text">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Summary Cards */}
      <div className="reports-summary-grid">
        <div className="reports-summary-card reports-summary-card-primary">
          <p className="reports-summary-label">Total Pendapatan</p>
          <p className="reports-summary-value">{formatCurrency(totalRevenue)}</p>
          <p className="reports-summary-meta">{pendapatanData.length} bulan tersedia</p>
        </div>

        <div className="reports-summary-card reports-summary-card-dark">
          <p className="reports-summary-label">Rata-rata Pendapatan/Bulan</p>
          <p className="reports-summary-value">{formatCurrency(averageRevenue)}</p>
          <p className="reports-summary-meta">Dari semua bulan</p>
        </div>

        <div className="reports-summary-card reports-summary-card-green">
          <p className="reports-summary-label">Bulan Terbaik</p>
          <p className="reports-summary-value" style={{ fontSize: '24px' }}>
            {topMonth ? topMonth.bulan_nama : '-'}
          </p>
          <p className="reports-summary-meta">
            {topMonth ? formatCurrency(topMonth.total_penjualan) : '-'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="reports-charts-grid">
        {/* Revenue Trend */}
        <div className="reports-chart-card">
          <h3 className="reports-chart-title">Tren Pendapatan</h3>
          <div className="reports-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pendapatanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bulan_tahun" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#F9F5F0', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_penjualan"
                  stroke="#F4991A"
                  strokeWidth={3}
                  dot={{ fill: '#F4991A', r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Total Penjualan"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Volume */}
        <div className="reports-chart-card">
          <h3 className="reports-chart-title">Volume Penjualan Per Bulan</h3>
          <div className="reports-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pendapatanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bulan_tahun" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#F9F5F0', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="jumlah_terjual" name="Unit Terjual" radius={[8, 8, 0, 0]}>
                  {pendapatanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#F4991A' : '#344F1F'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="reports-table-section">
        <div className="reports-table-header">
          <h3 className="reports-table-title">Laporan Penjualan Detail</h3>
          <button className="reports-export-btn">
            <Download size={18} />
            Export CSV
          </button>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead className="reports-table-head">
              <tr>
                <th className="reports-table-th">Bulan</th>
                <th className="reports-table-th reports-table-th-center">Unit Terjual</th>
                <th className="reports-table-th reports-table-th-right">Total Penjualan</th>
                <th className="reports-table-th reports-table-th-right">Rata-rata per Unit</th>
                <th className="reports-table-th reports-table-th-right">% Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              {pendapatanData.map((item, idx) => {
                const contribution = totalRevenue > 0 ? (item.total_penjualan / totalRevenue) * 100 : 0;
                const avgPerUnit = item.jumlah_terjual > 0 ? item.total_penjualan / item.jumlah_terjual : 0;

                return (
                  <tr
                    key={idx}
                    className={`reports-table-body-row ${
                      idx % 2 === 1 ? 'reports-table-body-row-alternate' : ''
                    }`}
                  >
                    <td className="reports-table-td">
                      <div className="reports-month-info">
                        <div>
                          <p className="reports-month-name">{item.bulan_nama}</p>
                          <p className="reports-month-date">{item.bulan_tahun}</p>
                        </div>
                      </div>
                    </td>
                    <td className="reports-table-td reports-table-td-center reports-table-td-primary">
                      {item.jumlah_terjual} unit
                    </td>
                    <td className="reports-table-td reports-table-td-right reports-table-td-accent">
                      {formatCurrency(item.total_penjualan)}
                    </td>
                    <td className="reports-table-td reports-table-td-right reports-table-td-secondary">
                      {formatCurrency(avgPerUnit)}
                    </td>
                    <td className="reports-table-td reports-table-td-right">
                      <div className="reports-trend-icon">
                        {contribution >= 0 ? (
                          <TrendingUp size={16} color="#059669" />
                        ) : (
                          <TrendingDown size={16} color="#dc2626" />
                        )}
                        <span className="reports-table-td-primary">
                          {contribution.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              {pendapatanData.length > 0 && (
                <tr className="reports-table-body-row-total">
                  <td className="reports-table-td reports-table-td-total">TOTAL</td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {pendapatanData.reduce((sum, item) => sum + item.jumlah_terjual, 0)} unit
                  </td>
                  <td className="reports-table-td reports-table-td-right reports-table-td-total">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="reports-table-td reports-table-td-right reports-table-td-total">
                    {formatCurrency(averageRevenue)}
                  </td>
                  <td className="reports-table-td reports-table-td-right reports-table-td-total">100.0%</td>
                </tr>
              )}

              {pendapatanData.length === 0 && (
                <tr>
                  <td colSpan="5" className="reports-no-data">
                    Tidak ada data laporan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      {financialData && (
        <div className="reports-financial-summary">
          <h3 className="reports-financial-title">Ringkasan Keuangan Terkini</h3>
          <div className="reports-financial-grid">
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Modal Saat Ini</span>
              <span className="reports-financial-item-value">
                {formatCurrency(financialData.total_modal)}
              </span>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Total Penjualan Semua</span>
              <span className="reports-financial-item-value" style={{ color: '#059669' }}>
                {formatCurrency(financialData.total_pendapatan)}
              </span>
            </div>
            <div className={`reports-financial-item ${
              financialData.persentase_perubahan >= 0 ? 'reports-financial-item-positive' : 'reports-financial-item-negative'
            }`}>
              <span className="reports-financial-item-label">Perubahan Bulan Ini</span>
              <div className="reports-financial-trend-icon">
                {financialData.persentase_perubahan >= 0 ? (
                  <TrendingUp size={18} color="#059669" />
                ) : (
                  <TrendingDown size={18} color="#dc2626" />
                )}
                <span className="reports-financial-item-value">
                  {financialData.persentase_perubahan.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Rata-rata Harian (30 hari)</span>
              <span className="reports-financial-item-value" style={{ color: '#D97706' }}>
                {formatCurrency(financialData.pengeluaran_harian)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
