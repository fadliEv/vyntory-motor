package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type App struct {
	ctx context.Context
	db  *sql.DB
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize SQLite database
	err := a.initDatabase()
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	fmt.Println("Dealer Motor Management App started with SQLite!")
}

// Motor model
type Motor struct {
	ID            string    `json:"id"`
	NamaMotor     string    `json:"nama_motor"`
	NomorPolisi   string    `json:"nomor_polisi"`
	Status        string    `json:"status"`
	Harga         float64   `json:"harga"`
	TanggalMasuk  string    `json:"tanggal_masuk"`
	TanggalKeluar string    `json:"tanggal_keluar,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Count   int         `json:"count,omitempty"`
}

// Database initialization
func (a *App) initDatabase() error {
	var err error
	a.db, err = sql.Open("sqlite3", "./dealer_motor.db")
	if err != nil {
		return err
	}

	// Create motors table saja
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS motors (
		id TEXT PRIMARY KEY,
		nama_motor TEXT NOT NULL,
		nomor_polisi TEXT UNIQUE NOT NULL,
		status TEXT NOT NULL CHECK(status IN ('tersedia', 'terjual', 'dalam_perbaikan')),
		harga REAL NOT NULL,
		tanggal_masuk DATE NOT NULL,
		tanggal_keluar DATE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_motors_status ON motors(status);
	CREATE INDEX IF NOT EXISTS idx_motors_nomor_polisi ON motors(nomor_polisi);
	`

	_, err = a.db.Exec(createTableSQL)
	return err
}

// Motor CRUD Operations

// AddMotor menambahkan motor baru
func (a *App) AddMotor(namaMotor, nomorPolisi, status string, harga float64, tanggalMasuk string) Response {
	// Validasi input
	if namaMotor == "" || nomorPolisi == "" {
		return Response{
			Success: false,
			Message: "Nama motor dan nomor polisi harus diisi",
		}
	}

	if harga <= 0 {
		return Response{
			Success: false,
			Message: "Harga harus lebih dari 0",
		}
	}

	validStatus := map[string]bool{
		"tersedia": true, "terjual": true, "dalam_perbaikan": true,
	}
	if !validStatus[status] {
		return Response{
			Success: false,
			Message: "Status tidak valid. Pilih: tersedia, terjual, atau dalam_perbaikan",
		}
	}

	// Validasi format tanggal
	if tanggalMasuk != "" {
		_, err := time.Parse("2006-01-02", tanggalMasuk)
		if err != nil {
			return Response{
				Success: false,
				Message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD",
			}
		}
	} else {
		tanggalMasuk = time.Now().Format("2006-01-02")
	}

	// Generate ID
	id := fmt.Sprintf("MTR-%d", time.Now().UnixNano())

	// Insert ke database
	query := `INSERT INTO motors (id, nama_motor, nomor_polisi, status, harga, tanggal_masuk) 
	          VALUES (?, ?, ?, ?, ?, ?)`

	_, err := a.db.Exec(query, id, namaMotor, nomorPolisi, status, harga, tanggalMasuk)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal menambahkan motor: " + err.Error(),
		}
	}

	// Get created motor
	motor, err := a.getMotorByID(id)
	if err != nil {
		return Response{
			Success: false,
			Message: "Motor berhasil ditambahkan tetapi gagal mengambil data: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: "Motor berhasil ditambahkan",
		Data:    motor,
	}
}

// GetMotors mengambil semua data motor
func (a *App) GetMotors() Response {
	query := `SELECT id, nama_motor, nomor_polisi, status, harga, tanggal_masuk, tanggal_keluar, created_at, updated_at 
	          FROM motors ORDER BY created_at DESC`

	rows, err := a.db.Query(query)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil data motor: " + err.Error(),
			Data:    []Motor{},
		}
	}
	defer rows.Close()

	var motors []Motor
	for rows.Next() {
		var motor Motor
		var tanggalMasukStr string
		var tanggalKeluar *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.Harga, &tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// GetMotorByID mengambil motor berdasarkan ID
func (a *App) GetMotorByID(id string) Response {
	motor, err := a.getMotorByID(id)
	if err != nil {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Data:    motor,
	}
}

// Helper function untuk get motor by ID
func (a *App) getMotorByID(id string) (*Motor, error) {
	query := `SELECT id, nama_motor, nomor_polisi, status, harga, tanggal_masuk, tanggal_keluar, created_at, updated_at 
	          FROM motors WHERE id = ?`

	var motor Motor
	var tanggalMasukStr string
	var tanggalKeluar *string

	err := a.db.QueryRow(query, id).Scan(
		&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
		&motor.Harga, &tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	motor.TanggalMasuk = tanggalMasukStr
	if tanggalKeluar != nil {
		motor.TanggalKeluar = *tanggalKeluar
	}
	return &motor, nil
}

// UpdateMotor mengupdate data motor
func (a *App) UpdateMotor(id, namaMotor, nomorPolisi, status string, harga float64, tanggalMasuk string) Response {
	// Validasi
	if id == "" {
		return Response{
			Success: false,
			Message: "ID motor harus diisi",
		}
	}

	// Validasi format tanggal jika diisi
	if tanggalMasuk != "" {
		_, err := time.Parse("2006-01-02", tanggalMasuk)
		if err != nil {
			return Response{
				Success: false,
				Message: "Format tanggal tidak valid. Gunakan YYYY-MM-DD",
			}
		}
	}

	// Build dynamic update query
	query := "UPDATE motors SET updated_at = CURRENT_TIMESTAMP"
	params := []interface{}{}

	if namaMotor != "" {
		query += ", nama_motor = ?"
		params = append(params, namaMotor)
	}
	if nomorPolisi != "" {
		query += ", nomor_polisi = ?"
		params = append(params, nomorPolisi)
	}
	if status != "" {
		validStatus := map[string]bool{"tersedia": true, "terjual": true, "dalam_perbaikan": true}
		if !validStatus[status] {
			return Response{
				Success: false,
				Message: "Status tidak valid",
			}
		}
		query += ", status = ?"
		params = append(params, status)
	}
	if harga > 0 {
		query += ", harga = ?"
		params = append(params, harga)
	}
	if tanggalMasuk != "" {
		query += ", tanggal_masuk = ?"
		params = append(params, tanggalMasuk)
	}

	query += " WHERE id = ?"
	params = append(params, id)

	result, err := a.db.Exec(query, params...)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal update motor: " + err.Error(),
		}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan",
		}
	}

	// Get updated motor
	motor, err := a.getMotorByID(id)
	if err != nil {
		return Response{
			Success: false,
			Message: "Motor berhasil diupdate tetapi gagal mengambil data: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: "Motor berhasil diupdate",
		Data:    motor,
	}
}

// UpdateMotorStatus mengupdate status motor saja
func (a *App) UpdateMotorStatus(id, status string) Response {
	validStatus := map[string]bool{"tersedia": true, "terjual": true, "dalam_perbaikan": true}
	if !validStatus[status] {
		return Response{
			Success: false,
			Message: "Status tidak valid",
		}
	}

	// Mulai transaction
	tx, err := a.db.Begin()
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal memulai transaction: " + err.Error(),
		}
	}
	defer tx.Rollback()

	// Update status motor
	var result sql.Result
	if status == "terjual" {
		// Jika status menjadi terjual, set tanggal_keluar dengan tanggal hari ini
		tanggalKeluar := time.Now().Format("2006-01-02")
		result, err = tx.Exec(
			"UPDATE motors SET status = ?, tanggal_keluar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			status, tanggalKeluar, id,
		)
	} else {
		// Jika status bukan terjual, set tanggal_keluar menjadi NULL
		result, err = tx.Exec(
			"UPDATE motors SET status = ?, tanggal_keluar = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			status, id,
		)
	}

	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal update status: " + err.Error(),
		}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan",
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return Response{
			Success: false,
			Message: "Gagal commit transaction: " + err.Error(),
		}
	}

	// Get updated motor
	motor, err := a.getMotorByID(id)
	if err != nil {
		return Response{
			Success: false,
			Message: "Status berhasil diupdate tetapi gagal mengambil data: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: "Status motor berhasil diupdate",
		Data:    motor,
	}
}

// DeleteMotor menghapus motor
func (a *App) DeleteMotor(id string) Response {
	if id == "" {
		return Response{
			Success: false,
			Message: "ID motor harus diisi",
		}
	}

	result, err := a.db.Exec("DELETE FROM motors WHERE id = ?", id)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal menghapus motor: " + err.Error(),
		}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan",
		}
	}

	return Response{
		Success: true,
		Message: "Motor berhasil dihapus",
	}
}

// SearchMotors mencari motor berdasarkan nama atau nomor polisi
func (a *App) SearchMotors(query string) Response {
	if query == "" {
		return a.GetMotors()
	}

	searchQuery := `%` + query + `%`
	sql := `SELECT id, nama_motor, nomor_polisi, status, harga, tanggal_masuk, tanggal_keluar, created_at, updated_at 
	        FROM motors 
	        WHERE nama_motor LIKE ? OR nomor_polisi LIKE ? 
	        ORDER BY created_at DESC`

	rows, err := a.db.Query(sql, searchQuery, searchQuery)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mencari motor: " + err.Error(),
			Data:    []Motor{},
		}
	}
	defer rows.Close()

	var motors []Motor
	for rows.Next() {
		var motor Motor
		var tanggalMasukStr string
		var tanggalKeluar *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.Harga, &tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// GetMotorsByStatus mengambil motor berdasarkan status
func (a *App) GetMotorsByStatus(status string) Response {
	validStatus := map[string]bool{"tersedia": true, "terjual": true, "dalam_perbaikan": true}
	if !validStatus[status] {
		return Response{
			Success: false,
			Message: "Status tidak valid",
			Data:    []Motor{},
		}
	}

	query := `SELECT id, nama_motor, nomor_polisi, status, harga, tanggal_masuk, tanggal_keluar, created_at, updated_at 
	          FROM motors WHERE status = ? ORDER BY created_at DESC`

	rows, err := a.db.Query(query, status)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil data motor: " + err.Error(),
			Data:    []Motor{},
		}
	}
	defer rows.Close()

	var motors []Motor
	for rows.Next() {
		var motor Motor
		var tanggalMasukStr string
		var tanggalKeluar *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.Harga, &tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// GetPendapatanBulanan mengambil data pendapatan per bulan dari SEMUA motor terjual
func (a *App) GetPendapatanBulanan() Response {
	fmt.Println("🔍 GetPendapatanBulanan: Query dari tabel motors...")

	// Query langsung dari tabel motors dimana status = 'terjual'
	query := `
	SELECT 
		strftime('%Y-%m', tanggal_keluar) as bulan_tahun,
		strftime('%Y', tanggal_keluar) as tahun,
		strftime('%m', tanggal_keluar) as bulan,
		COUNT(*) as jumlah_terjual,
		SUM(harga) as total_penjualan
	FROM motors 
	WHERE status = 'terjual' AND tanggal_keluar IS NOT NULL AND tanggal_keluar != ''
	GROUP BY strftime('%Y-%m', tanggal_keluar)
	ORDER BY tahun DESC, bulan DESC
	`

	rows, err := a.db.Query(query)
	if err != nil {
		fmt.Println("❌ Error GetPendapatanBulanan:", err)
		return Response{
			Success: false,
			Message: "Gagal mengambil data pendapatan bulanan: " + err.Error(),
			Data:    []interface{}{},
		}
	}
	defer rows.Close()

	var pendapatanBulanan []map[string]interface{}
	for rows.Next() {
		var bulanTahun, tahun, bulan string
		var jumlahTerjual int
		var totalPenjualan float64

		err := rows.Scan(&bulanTahun, &tahun, &bulan, &jumlahTerjual, &totalPenjualan)
		if err != nil {
			fmt.Println("❌ Error scanning row:", err)
			continue
		}

		// Konversi bulan angka ke nama bulan Indonesia
		namaBulan := getNamaBulanIndonesia(bulan)

		pendapatanBulanan = append(pendapatanBulanan, map[string]interface{}{
			"bulan_tahun":     bulanTahun,
			"tahun":           tahun,
			"bulan":           bulan,
			"bulan_nama":      namaBulan,
			"jumlah_terjual":  jumlahTerjual,
			"total_penjualan": totalPenjualan,
		})
	}

	fmt.Printf("📊 GetPendapatanBulanan: %d records ditemukan\n", len(pendapatanBulanan))
	for i, item := range pendapatanBulanan {
		fmt.Printf("  %d. %s - %d motor - %.0f\n", i+1, item["bulan_tahun"], item["jumlah_terjual"], item["total_penjualan"])
	}

	return Response{
		Success: true,
		Data:    pendapatanBulanan,
		Count:   len(pendapatanBulanan),
	}
}

// Helper function untuk mendapatkan nama bulan Indonesia
func getNamaBulanIndonesia(bulan string) string {
	bulanMap := map[string]string{
		"01": "Januari", "02": "Februari", "03": "Maret", "04": "April",
		"05": "Mei", "06": "Juni", "07": "Juli", "08": "Agustus",
		"09": "September", "10": "Oktober", "11": "November", "12": "Desember",
	}
	return bulanMap[bulan]
}

// GetFinancialSummary mengambil ringkasan keuangan
func (a *App) GetFinancialSummary() Response {
	// Total modal (semua motor yang tersedia dan dalam perbaikan)
	var totalModal float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga), 0) FROM motors WHERE status IN ('tersedia', 'dalam_perbaikan')").Scan(&totalModal)

	// Total pendapatan (motor terjual)
	var totalPendapatan float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga), 0) FROM motors WHERE status = 'terjual'").Scan(&totalPendapatan)

	// Pendapatan bulan ini
	var pendapatanBulanIni float64
	currentMonth := time.Now().Format("2006-01")
	a.db.QueryRow("SELECT COALESCE(SUM(harga), 0) FROM motors WHERE status = 'terjual' AND strftime('%Y-%m', tanggal_keluar) = ?", currentMonth).Scan(&pendapatanBulanIni)

	// Pendapatan bulan lalu
	var pendapatanBulanLalu float64
	lastMonth := time.Now().AddDate(0, -1, 0).Format("2006-01")
	a.db.QueryRow("SELECT COALESCE(SUM(harga), 0) FROM motors WHERE status = 'terjual' AND strftime('%Y-%m', tanggal_keluar) = ?", lastMonth).Scan(&pendapatanBulanLalu)

	// Persentase perubahan
	persentasePerubahan := 0.0
	if pendapatanBulanLalu > 0 {
		persentasePerubahan = ((pendapatanBulanIni - pendapatanBulanLalu) / pendapatanBulanLalu) * 100
	} else if pendapatanBulanIni > 0 {
		persentasePerubahan = 100.0
	}

	// Hitung rata-rata pengeluaran harian (30 hari terakhir)
	var pengeluaranHarian float64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	a.db.QueryRow(`
		SELECT COALESCE(SUM(harga) / 30.0, 0) 
		FROM motors 
		WHERE tanggal_masuk >= ? AND status IN ('tersedia', 'dalam_perbaikan')
	`, thirtyDaysAgo).Scan(&pengeluaranHarian)

	summary := map[string]interface{}{
		"total_modal":           totalModal,
		"total_pendapatan":      totalPendapatan,
		"pendapatan_bulan_ini":  pendapatanBulanIni,
		"pendapatan_bulan_lalu": pendapatanBulanLalu,
		"persentase_perubahan":  persentasePerubahan,
		"pengeluaran_harian":    pengeluaranHarian,
		"updated_at":            time.Now().Format("2006-01-02 15:04:05"),
	}

	return Response{
		Success: true,
		Data:    summary,
	}
}

// DebugMotorsTerjual - untuk debugging data motor terjual
// func (a *App) DebugMotorsTerjual() Response {
// 	fmt.Println("🔍 DebugMotorsTerjual: Mengecek semua motor terjual...")

// 	query := `
// 	SELECT id, nama_motor, nomor_polisi, harga, tanggal_masuk, tanggal_keluar 
// 	FROM motors 
// 	WHERE status = 'terjual' 
// 	ORDER BY tanggal_keluar DESC
// 	`

// 	rows, err := a.db.Query(query)
// 	if err != nil {
// 		return Response{
// 			Success: false,
// 			Message: "Error debug: " + err.Error(),
// 		}
// 	}
// 	defer rows.Close()

// 	var debugData []map[string]interface{}
// 	var totalRecords int

// 	for rows.Next() {
// 		var id, namaMotor, nomorPolisi, tanggalMasuk, tanggalKeluar string
// 		var harga float64

// 		err := rows.Scan(&id, &namaMotor, &nomorPolisi, &harga, &tanggalMasuk, &tanggalKeluar)
// 		if err != nil {
// 			fmt.Println("❌ Error scanning debug row:", err)
// 			continue
// 		}

// 		fmt.Printf("   🏍️ %s | %s | %s | Masuk: %s | Keluar: %s | Harga: %.0f\n",
// 			id, namaMotor, nomorPolisi, tanggalMasuk, tanggalKeluar, harga)

// 		debugData = append(debugData, map[string]interface{}{
// 			"id":             id,
// 			"nama_motor":     namaMotor,
// 			"nomor_polisi":   nomorPolisi,
// 			"harga":          harga,
// 			"tanggal_masuk":  tanggalMasuk,
// 			"tanggal_keluar": tanggalKeluar,
// 		})
// 		totalRecords++
// 	}

// 	fmt.Printf("✅ Total motor terjual: %d\n", totalRecords)

// 	return Response{
// 		Success: true,
// 		Data: map[string]interface{}{
// 			"total_records": totalRecords,
// 			"data":          debugData,
// 		},
// 	}
// }
