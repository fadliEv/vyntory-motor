import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { GetPendapatanBulanan, GetFinancialSummary, GetAvailableYears } from '../../wailsjs/go/main/App';
import './Reports.css';

export default function Reports() {
  const [pendapatanData, setPendapatanData] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadPendapatanData();
    }
  }, [selectedYear]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Check if Wails is ready
      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadReportData, 500);
        return;
      }

      const [pendResp, finResp, yearsResp] = await Promise.all([
        GetPendapatanBulanan(selectedYear),
        GetFinancialSummary(),
        GetAvailableYears(),
      ]);

      if (pendResp.success) {
        setPendapatanData(pendResp.data || []);
      }
      if (finResp.success) {
        setFinancialData(finResp.data);
      }
      if (yearsResp.success) {
        setAvailableYears(yearsResp.data || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendapatanData = async () => {
    try {
      if (!window.go || !window.go.main) {
        return;
      }

      const pendResp = await GetPendapatanBulanan(selectedYear);
      if (pendResp.success) {
        setPendapatanData(pendResp.data || []);
      }
    } catch (error) {
      console.error('Error loading pendapatan data:', error);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getNamaBulanIndonesia = (bulan) => {
    const bulanMap = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
      '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
      '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    return bulanMap[bulan] || bulan;
  };

  const calculateTotalRevenue = () => {
    return pendapatanData.reduce((sum, item) => sum + (item.total_penjualan || 0), 0);
  };

  const calculateTotalModal = () => {
    return pendapatanData.reduce((sum, item) => {
      const modal = Number(item.total_modal) || 0;
      return sum + modal;
    }, 0);
  };

  const calculateTotalProfit = () => {
    return pendapatanData.reduce((sum, item) => {
      const profit = Number(item.total_profit) || 0;
      return sum + profit;
    }, 0);
  };

  const calculateAverageRevenue = () => {
    if (pendapatanData.length === 0) return 0;
    return calculateTotalRevenue() / pendapatanData.length;
  };

  const calculateAverageProfit = () => {
    if (pendapatanData.length === 0) return 0;
    return calculateTotalProfit() / pendapatanData.length;
  };

  const getTopMonth = () => {
    if (pendapatanData.length === 0) return null;
    return pendapatanData.reduce((max, item) =>
      (item.total_profit > max.total_profit) ? item : max
    );
  };

  const topMonth = getTopMonth();
  const totalRevenue = calculateTotalRevenue();
  const totalModal = calculateTotalModal();
  const totalProfit = calculateTotalProfit();
  const averageRevenue = calculateAverageRevenue();
  const averageProfit = calculateAverageProfit();

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
          <p className="reports-summary-label">Total Modal Dikeluarkan</p>
          <p className="reports-summary-value">{formatCurrency(totalModal)}</p>
          <p className="reports-summary-meta">Modal untuk pembelian motor</p>
        </div>

        <div className="reports-summary-card reports-summary-card-dark">
          <p className="reports-summary-label">Total Penjualan</p>
          <p className="reports-summary-value">{formatCurrency(totalRevenue)}</p>
          <p className="reports-summary-meta">Uang masuk dari penjualan</p>
        </div>

        <div className="reports-summary-card reports-summary-card-green">
          <p className="reports-summary-label">Total Profit/Laba</p>
          <p className="reports-summary-value">{formatCurrency(totalProfit)}</p>
          <p className="reports-summary-meta">Keuntungan bersih tahun ini</p>
        </div>

        <div className="reports-summary-card reports-summary-card-primary">
          <p className="reports-summary-label">Rata-rata Profit/Bulan</p>
          <p className="reports-summary-value">{formatCurrency(averageProfit)}</p>
          <p className="reports-summary-meta">{pendapatanData.length} bulan data</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="reports-table-section">
        <div className="reports-table-header">
          <div className="reports-table-header-left">
            <h3 className="reports-table-title">Laporan Penjualan Detail</h3>
            {availableYears.length > 0 && (
              <div className="reports-year-selector">
                <label>Tahun:</label>
                <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button className="reports-export-btn">
            <Download size={18} />
            Export CSV
          </button>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead className="reports-table-head">
              <tr>
                <th className="reports-table-th reports-table-th-center">Bulan</th>
                <th className="reports-table-th reports-table-th-center">Unit Terjual</th>
                <th className="reports-table-th reports-table-th-center">Total Modal</th>
                <th className="reports-table-th reports-table-th-center">Total Penjualan</th>
                <th className="reports-table-th reports-table-th-center">Profit</th>
                <th className="reports-table-th reports-table-th-center">% Margin</th>
              </tr>
            </thead>
            <tbody>
              {pendapatanData.map((item, idx) => {
                const modal = Number(item.total_modal) || 0;
                const profit = Number(item.total_profit) || 0;
                const penjualan = Number(item.total_penjualan) || 0;
                const profitMargin = modal > 0 ? ((profit / modal) * 100) : 0;

                return (
                  <tr
                    key={idx}
                    className={`reports-table-body-row ${
                      idx % 2 === 1 ? 'reports-table-body-row-alternate' : ''
                    }`}
                  >
                    <td className="reports-table-td reports-table-td-center">
                      <div className="reports-month-info-centered">
                        <p className="reports-month-name">{getNamaBulanIndonesia(item.bulan)}</p>
                        <p className="reports-month-date">{item.bulan_tahun}</p>
                      </div>
                    </td>
                    <td className="reports-table-td reports-table-td-center reports-table-td-primary">
                      {item.jumlah_terjual} unit
                    </td>
                    <td className="reports-table-td reports-table-td-center" style={{ color: '#dc2626' }}>
                      {formatCurrency(modal)}
                    </td>
                    <td className="reports-table-td reports-table-td-center reports-table-td-accent">
                      {formatCurrency(penjualan)}
                    </td>
                    <td className="reports-table-td reports-table-td-center" style={{ color: '#059669', fontWeight: '600' }}>
                      {formatCurrency(profit)}
                    </td>
                    <td className="reports-table-td reports-table-td-center">
                      <div className="reports-trend-icon-centered">
                        {profitMargin >= 0 ? (
                          <TrendingUp size={16} color="#059669" />
                        ) : (
                          <TrendingDown size={16} color="#dc2626" />
                        )}
                        <span className="reports-table-td-primary">
                          {profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              {pendapatanData.length > 0 && (
                <tr className="reports-table-body-row-total">
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">TOTAL</td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {pendapatanData.reduce((sum, item) => sum + item.jumlah_terjual, 0)} unit
                  </td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {formatCurrency(totalModal)}
                  </td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {formatCurrency(totalProfit)}
                  </td>
                  <td className="reports-table-td reports-table-td-center reports-table-td-total">
                    {totalModal > 0 ? ((totalProfit / totalModal) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              )}

              {pendapatanData.length === 0 && (
                <tr>
                  <td colSpan="6" className="reports-no-data">
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
          <h3 className="reports-financial-title">Ringkasan Keuangan {selectedYear}</h3>
          <div className="reports-financial-grid">
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Total Modal Dikeluarkan</span>
              <span className="reports-financial-item-value" style={{ color: '#dc2626' }}>
                {formatCurrency(Number(financialData.total_modal_dikeluarkan) || 0)}
              </span>
              <span className="reports-financial-item-meta">Semua pembelian motor</span>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Modal Belum Kembali</span>
              <span className="reports-financial-item-value" style={{ color: '#D97706' }}>
                {formatCurrency(Number(financialData.total_modal) || 0)}
              </span>
              <span className="reports-financial-item-meta">Motor belum terjual</span>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Total Penjualan</span>
              <span className="reports-financial-item-value" style={{ color: '#F4991A' }}>
                {formatCurrency(Number(financialData.total_pendapatan) || 0)}
              </span>
              <span className="reports-financial-item-meta">Uang masuk dari penjualan</span>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Total Profit</span>
              <span className="reports-financial-item-value" style={{ color: '#059669' }}>
                {formatCurrency(Number(financialData.total_profit) || 0)}
              </span>
              <span className="reports-financial-item-meta">Keuntungan bersih</span>
            </div>
            <div className="reports-financial-item">
              <span className="reports-financial-item-label">Penjualan Bulan Ini</span>
              <span className="reports-financial-item-value">
                {formatCurrency(Number(financialData.pendapatan_bulan_ini) || 0)}
              </span>
              <span className="reports-financial-item-meta">
                Profit: {formatCurrency(Number(financialData.profit_bulan_ini) || 0)}
              </span>
            </div>
            <div className={`reports-financial-item ${
              (Number(financialData.persentase_perubahan) || 0) >= 0 ? 'reports-financial-item-positive' : 'reports-financial-item-negative'
            }`}>
              <span className="reports-financial-item-label">Perubahan vs Bulan Lalu</span>
              <div className="reports-financial-trend-icon">
                {(Number(financialData.persentase_perubahan) || 0) >= 0 ? (
                  <TrendingUp size={18} color="#059669" />
                ) : (
                  <TrendingDown size={18} color="#dc2626" />
                )}
                <span className="reports-financial-item-value">
                  {(Number(financialData.persentase_perubahan) || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
