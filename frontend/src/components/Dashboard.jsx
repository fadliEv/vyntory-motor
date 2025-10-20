import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, DollarSign, Zap, ShoppingCart, Calendar, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { GetMotors, GetFinancialSummary, GetPendapatanBulanan, GetTodayStats, GetTodaySoldMotors, GetTodayPurchasedMotors, GetAvailableYears } from '../../wailsjs/go/main/App';
import './Dashboard.css';

export default function Dashboard() {
  const [financialData, setFinancialData] = useState(null);
  const [pendapatanData, setPendapatanData] = useState([]);
  const [motors, setMotors] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [todaySoldMotors, setTodaySoldMotors] = useState([]);
  const [todayPurchasedMotors, setTodayPurchasedMotors] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (!window.go || !window.go.main) {
        console.warn('Wails runtime not ready yet');
        setTimeout(loadDashboardData, 500);
        return;
      }

      // Load all data in parallel
      const [financialResp, pendapatanResp, motorsResp, todayStatsResp, todaySoldResp, todayPurchasedResp, yearsResp] = await Promise.all([
        GetFinancialSummary(),
        GetPendapatanBulanan(selectedYear),
        GetMotors(),
        GetTodayStats(),
        GetTodaySoldMotors(),
        GetTodayPurchasedMotors(),
        GetAvailableYears()
      ]);

      if (financialResp.success) setFinancialData(financialResp.data);

      // Fill missing months with zero data to ensure 12 months display
      if (pendapatanResp.success) {
        const dataByMonth = {};
        (pendapatanResp.data || []).forEach(item => {
          dataByMonth[item.bulan] = item;
        });

        // Create full 12 months data
        const fullYearData = [];
        for (let month = 1; month <= 12; month++) {
          const monthStr = month.toString().padStart(2, '0');
          const bulanTahun = `${selectedYear}-${monthStr}`;

          if (dataByMonth[monthStr]) {
            fullYearData.push(dataByMonth[monthStr]);
          } else {
            // Fill with zero data for missing months
            fullYearData.push({
              bulan_tahun: bulanTahun,
              tahun: selectedYear,
              bulan: monthStr,
              bulan_nama: getNamaBulanIndonesia(monthStr),
              jumlah_terjual: 0,
              total_modal: 0,
              total_penjualan: 0,
              total_profit: 0
            });
          }
        }
        setPendapatanData(fullYearData);
      }

      if (motorsResp.success) setMotors(motorsResp.data || []);
      if (todayStatsResp.success) setTodayStats(todayStatsResp.data);
      if (todaySoldResp.success) setTodaySoldMotors(todaySoldResp.data || []);
      if (todayPurchasedResp.success) setTodayPurchasedMotors(todayPurchasedResp.data || []);
      if (yearsResp.success) setAvailableYears(yearsResp.data || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNamaBulanIndonesia = (bulan) => {
    const bulanMap = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
      '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
      '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
    };
    return bulanMap[bulan] || bulan;
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  // Reload data when year changes
  useEffect(() => {
    if (selectedYear) {
      loadDashboardData();
    }
  }, [selectedYear]);

  const inventoryStats = {
    total: motors.length,
    tersedia: motors.filter(m => m.status === 'tersedia').length,
    terjual: motors.filter(m => m.status === 'terjual').length,
    perbaikan: motors.filter(m => m.status === 'dalam_perbaikan').length,
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const TodayCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="today-card" style={{ borderLeftColor: color }}>
      <div className="today-card-header">
        <div className="today-card-icon" style={{ backgroundColor: color + '20', color: color }}>
          <Icon size={24} />
        </div>
        <div className="today-card-content">
          <p className="today-card-label">{title}</p>
          <h2 className="today-card-value">{value}</h2>
          {subtitle && <p className="today-card-subtitle">{subtitle}</p>}
          {trend !== undefined && trend !== 0 && (
            <div className={`today-card-trend ${trend > 0 ? 'positive' : 'negative'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend > 0 ? '+' : ''}{formatCurrency(trend)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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

  const today = todayStats || {};

  return (
    <div className="dashboard-container">
      {/* Header with Today's Date */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            <Calendar size={16} /> {formatDate(today.tanggal || new Date().toISOString())}
          </p>
        </div>
        <button onClick={loadDashboardData} className="refresh-button">
          <Zap size={16} /> Refresh
        </button>
      </div>

      {/* TODAY'S ACTIVITY SECTION */}
      <div className="dashboard-section">
        <h2 className="section-title">Aktivitas Hari Ini</h2>
        <div className="today-cards-grid">
          <TodayCard
            title="Motor Terjual"
            value={today.motors_terjual || 0}
            subtitle={`Pendapatan: ${formatCurrency(today.pendapatan)}`}
            icon={ShoppingCart}
            color="#059669"
          />
          <TodayCard
            title="Profit Hari Ini"
            value={formatCurrency(today.profit)}
            subtitle={`Dari ${today.motors_terjual || 0} transaksi`}
            icon={TrendingUp}
            color="#F4991A"
            trend={today.profit}
          />
          <TodayCard
            title="Motor Dibeli"
            value={today.motors_dibeli || 0}
            subtitle={`Modal: ${formatCurrency(today.modal_keluar_pembelian)}`}
            icon={Package}
            color="#3B82F6"
          />
          <TodayCard
            title="Net Cashflow"
            value={formatCurrency(today.net_cashflow)}
            subtitle={`Masuk - Keluar`}
            icon={today.net_cashflow >= 0 ? ArrowUpCircle : ArrowDownCircle}
            color={today.net_cashflow >= 0 ? '#10B981' : '#EF4444'}
          />
        </div>
      </div>

      {/* DETAILED TODAY'S ACTIVITIES */}
      <div className="dashboard-section">
        <div className="activities-grid">
          {/* Today's Sold Motors */}
          <div className="activity-card">
            <div className="activity-card-header">
              <h3 className="activity-card-title">Motor Terjual Hari Ini</h3>
              <span className="activity-badge">{todaySoldMotors.length} unit</span>
            </div>
            <div className="activity-card-body">
              {todaySoldMotors.length === 0 ? (
                <p className="empty-state">Belum ada motor terjual hari ini</p>
              ) : (
                <div className="activity-list">
                  {todaySoldMotors.map((motor, idx) => (
                    <div key={idx} className="activity-item">
                      <div className="activity-item-main">
                        <p className="activity-item-title">{motor.motor_nama}</p>
                        <p className="activity-item-subtitle">{motor.motor_nomor_polisi} • {motor.customer_name}</p>
                      </div>
                      <div className="activity-item-values">
                        <p className="activity-item-price">{formatCurrency(motor.harga_beli)}</p>
                        <p className={`activity-item-profit ${motor.profit >= 0 ? 'positive' : 'negative'}`}>
                          Profit: {formatCurrency(motor.profit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's Purchased Motors */}
          <div className="activity-card">
            <div className="activity-card-header">
              <h3 className="activity-card-title">Motor Dibeli Hari Ini</h3>
              <span className="activity-badge">{todayPurchasedMotors.length} unit</span>
            </div>
            <div className="activity-card-body">
              {todayPurchasedMotors.length === 0 ? (
                <p className="empty-state">Belum ada pembelian motor hari ini</p>
              ) : (
                <div className="activity-list">
                  {todayPurchasedMotors.map((motor, idx) => (
                    <div key={idx} className="activity-item">
                      <div className="activity-item-main">
                        <p className="activity-item-title">{motor.nama_motor}</p>
                        <p className="activity-item-subtitle">
                          {motor.nomor_polisi} • {motor.nama_penjual || 'Penjual tidak tercatat'}
                        </p>
                      </div>
                      <div className="activity-item-values">
                        <p className="activity-item-price">{formatCurrency(motor.harga_modal)}</p>
                        <p className="activity-item-status status-tersedia">
                          {motor.status === 'tersedia' ? 'Tersedia' : motor.status === 'baru_masuk' ? 'Baru Masuk' : motor.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OVERALL KPI CARDS */}
      <div className="dashboard-section">
        <h2 className="section-title">Ringkasan Keseluruhan</h2>
        <div className="kpi-grid">
          <KPICard
            title="Total Inventory"
            value={`${inventoryStats.total} unit`}
            icon={Package}
          />
          <KPICard
            title="Total Pendapatan"
            value={formatCurrency(financialData?.total_pendapatan || 0)}
            icon={DollarSign}
          />
          <KPICard
            title="Total Profit"
            value={formatCurrency(financialData?.total_profit || 0)}
            icon={TrendingUp}
          />
          <KPICard
            title="Pendapatan Bulan Ini"
            value={formatCurrency(financialData?.pendapatan_bulan_ini || 0)}
            icon={Zap}
            trend={financialData?.persentase_perubahan || 0}
          />
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="dashboard-section">
        <div className="charts-header">
          <h2 className="section-title">Statistik Bulanan</h2>
          {availableYears.length > 0 && (
            <div className="year-selector">
              <label>Tahun:</label>
              <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="charts-grid">
          {/* Revenue Trend Chart */}
          <div className="chart-card">
            <h3 className="chart-card-title">Tren Pendapatan & Profit ({selectedYear})</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pendapatanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bulan_nama" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#F9F5F0', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_penjualan"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Pendapatan"
                  />
                  <Line
                    type="monotone"
                    dataKey="total_profit"
                    stroke="#F4991A"
                    strokeWidth={2}
                    dot={{ fill: '#F4991A', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Sales Bar Chart */}
          <div className="chart-card">
            <h3 className="chart-card-title">Jumlah Penjualan Per Bulan ({selectedYear})</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pendapatanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bulan_nama" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#F9F5F0', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="jumlah_terjual" fill="#059669" name="Unit Terjual" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* INVENTORY STATUS */}
      <div className="dashboard-section">
        <h2 className="section-title">Status Inventory</h2>
        <div className="status-cards-grid">
          <div className="status-card" style={{ borderColor: '#F4991A' }}>
            <div className="status-card-icon" style={{ backgroundColor: '#F4991A' }}>
              <Package size={28} color="white" />
            </div>
            <div className="status-card-content">
              <h3 className="status-card-value">{inventoryStats.tersedia}</h3>
              <p className="status-card-label">Siap Jual</p>
            </div>
          </div>
          <div className="status-card" style={{ borderColor: '#059669' }}>
            <div className="status-card-icon" style={{ backgroundColor: '#059669' }}>
              <TrendingUp size={28} color="white" />
            </div>
            <div className="status-card-content">
              <h3 className="status-card-value">{inventoryStats.terjual}</h3>
              <p className="status-card-label">Terjual</p>
            </div>
          </div>
          <div className="status-card" style={{ borderColor: '#D97706' }}>
            <div className="status-card-icon" style={{ backgroundColor: '#D97706' }}>
              <Zap size={28} color="white" />
            </div>
            <div className="status-card-content">
              <h3 className="status-card-value">{inventoryStats.perbaikan}</h3>
              <p className="status-card-label">Perbaikan</p>
            </div>
          </div>
          <div className="status-card" style={{ borderColor: '#3B82F6' }}>
            <div className="status-card-icon" style={{ backgroundColor: '#3B82F6' }}>
              <DollarSign size={28} color="white" />
            </div>
            <div className="status-card-content">
              <h3 className="status-card-value">{formatCurrency(financialData?.total_modal || 0)}</h3>
              <p className="status-card-label">Modal Tertanam</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
