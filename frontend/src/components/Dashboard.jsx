import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, DollarSign, Zap, AlertCircle } from 'lucide-react';
import { GetMotors, GetFinancialSummary, GetPendapatanBulanan } from '../../wailsjs/go/main/App';
import './Dashboard.css';

export default function Dashboard() {
  const [financialData, setFinancialData] = useState(null);
  const [pendapatanData, setPendapatanData] = useState([]);
  const [motors, setMotors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadDashboardData, 500);
        return;
      }

      const financialResp = await GetFinancialSummary();
      if (financialResp.success) {
        setFinancialData(financialResp.data);
      }

      const pendapatanResp = await GetPendapatanBulanan();
      if (pendapatanResp.success) {
        setPendapatanData(pendapatanResp.data || []);
      }

      const motorsResp = await GetMotors();
      if (motorsResp.success) {
        setMotors(motorsResp.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const inventoryStats = {
    total: motors.length,
    tersedia: motors.filter(m => m.status === 'tersedia').length,
    terjual: motors.filter(m => m.status === 'terjual').length,
    perbaikan: motors.filter(m => m.status === 'dalam_perbaikan').length,
  };

  const pieData = [
    { name: 'Tersedia', value: inventoryStats.tersedia, fill: '#F4991A' },
    { name: 'Terjual', value: inventoryStats.terjual, fill: '#344F1F' },
    { name: 'Perbaikan', value: inventoryStats.perbaikan, fill: '#F2EAD3' },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const KPICard = ({ title, value, icon: Icon, trend }) => (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <div className="kpi-card-info">
          <p className="kpi-card-label">{title}</p>
          <p className="kpi-card-value">{value}</p>
          {trend !== undefined && (
            <div className={`kpi-card-trend ${trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(trend).toFixed(1)}% vs bulan lalu</span>
            </div>
          )}
        </div>
        <div className="kpi-card-icon">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner"></div>
        <p>Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Total Modal"
          value={formatCurrency(financialData?.total_modal || 0)}
          icon={DollarSign}
        />
        <KPICard
          title="Total Penjualan"
          value={formatCurrency(financialData?.total_pendapatan || 0)}
          icon={TrendingUp}
        />
        <KPICard
          title="Pendapatan Bulan Ini"
          value={formatCurrency(financialData?.pendapatan_bulan_ini || 0)}
          icon={Zap}
          trend={financialData?.persentase_perubahan || 0}
        />
        <KPICard
          title="Total Inventory"
          value={inventoryStats.total}
          icon={Package}
        />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Revenue Trend Chart */}
        <div className="chart-card">
          <h3 className="chart-card-title">Tren Pendapatan Bulanan</h3>
          <div className="chart-container">
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
                  strokeWidth={2}
                  dot={{ fill: '#F4991A', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Total Penjualan"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Status Pie */}
        <div className="chart-card">
          <h3 className="chart-card-title">Status Inventory</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} unit`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pie-legend">
            {pieData.map((item, idx) => (
              <div key={idx} className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: item.fill }}></div>
                <span>{item.name}: {item.value} unit</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="bottom-stats-grid">
        {/* Monthly Sales Bar Chart */}
        <div className="chart-card">
          <h3 className="chart-card-title">Jumlah Penjualan Per Bulan</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pendapatanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bulan_tahun" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#F9F5F0', border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="jumlah_terjual" fill="#F4991A" name="Unit Terjual" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status & Financial Summary */}
        <div className="stats-section">
          <h3 className="stats-section-title">Status Inventory</h3>
          <div className="stats-grid">
            <div className="stat-item" style={{ backgroundColor: 'rgba(244, 153, 26, 0.05)' }}>
              <div className="stat-item-icon" style={{ backgroundColor: '#F4991A' }}>
                <Package size={20} color="white" />
              </div>
              <div className="stat-item-content">
                <span className="stat-item-label">Siap Jual</span>
                <span className="stat-item-value">{inventoryStats.tersedia}</span>
              </div>
            </div>
            <div className="stat-item" style={{ backgroundColor: 'rgba(5, 150, 105, 0.05)' }}>
              <div className="stat-item-icon" style={{ backgroundColor: '#059669' }}>
                <TrendingUp size={20} color="white" />
              </div>
              <div className="stat-item-content">
                <span className="stat-item-label">Terjual</span>
                <span className="stat-item-value">{inventoryStats.terjual}</span>
              </div>
            </div>
            <div className="stat-item" style={{ backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <div className="stat-item-icon" style={{ backgroundColor: '#D97706' }}>
                <AlertCircle size={20} color="white" />
              </div>
              <div className="stat-item-content">
                <span className="stat-item-label">Perbaikan</span>
                <span className="stat-item-value">{inventoryStats.perbaikan}</span>
              </div>
            </div>
          </div>

          <h3 className="stats-section-title" style={{ marginTop: '24px' }}>Ringkasan Keuangan</h3>
          <div className="stats-list">
            <div className="stats-list-item">
              <span className="stats-list-label">Pendapatan Bulan Lalu</span>
              <span className="stats-list-value">{formatCurrency(financialData?.pendapatan_bulan_lalu || 0)}</span>
            </div>
            <div className="stats-list-item">
              <span className="stats-list-label">Rata-rata Harian (30 hari)</span>
              <span className="stats-list-value">{formatCurrency(financialData?.pengeluaran_harian || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
