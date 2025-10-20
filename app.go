package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
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
	ID               string    `json:"id"`
	NamaMotor        string    `json:"nama_motor"`
	NomorPolisi      string    `json:"nomor_polisi"`
	Status           string    `json:"status"`
	HargaModal       float64   `json:"harga_modal"`     // Harga beli/modal
	Harga            float64   `json:"harga"`           // Harga jual
	Warna            string    `json:"warna"`
	TahunMotor       string    `json:"tahun_motor"`     // Tahun produksi/release motor
	PajakDate        string    `json:"pajak_date"`      // Format: "2026"
	NamaPenjual      string    `json:"nama_penjual"`      // Nama penjual (toko/perorangan)
	TeleponPenjual   string    `json:"telepon_penjual"`   // No telepon penjual
	AlamatPenjual    string    `json:"alamat_penjual"`    // Alamat penjual
	TanggalMasuk     string    `json:"tanggal_masuk"`
	TanggalKeluar    string    `json:"tanggal_keluar,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Capital struct {
	ID             int       `json:"id"`
	CurrentBalance float64   `json:"current_balance"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CapitalTransaction struct {
	ID              string    `json:"id"`
	TransactionType string    `json:"transaction_type"` // 'add' or 'subtract'
	Amount          float64   `json:"amount"`
	BalanceBefore   float64   `json:"balance_before"`
	BalanceAfter    float64   `json:"balance_after"`
	Description     string    `json:"description"`
	ReferenceType   string    `json:"reference_type"`   // 'motor_purchase', 'manual_add', 'manual_subtract'
	ReferenceID     string    `json:"reference_id"`     // Motor ID jika dari pembelian motor
	CreatedAt       time.Time `json:"created_at"`
}

type Transaction struct {
	ID                string    `json:"id"`
	InvoiceNumber     string    `json:"invoice_number"`      // Invoice number format: INV/YYYY/MM/XXXXXX
	MotorID           string    `json:"motor_id"`
	MotorNama         string    `json:"motor_nama"`          // Denormalized for easier display
	MotorNomorPolisi  string    `json:"motor_nomor_polisi"`  // Denormalized for easier display
	CustomerName      string    `json:"customer_name"`
	CustomerPhone     string    `json:"customer_phone"`
	CustomerAddress   string    `json:"customer_address"`
	HargaBeli         float64   `json:"harga_beli"`          // Harga yang dibayar customer (bisa beda karena nego)
	TanggalTransaksi  string    `json:"tanggal_transaksi"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
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

	// Get the working directory and construct database path
	wd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get working directory: %w", err)
	}

	// Try to find dealer_motor.db in the current working directory
	dbPath := filepath.Join(wd, "dealer_motor.db")

	// If not found in cwd, check parent directory (for when running from build/bin/)
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		parentDir := filepath.Dir(wd)
		altDbPath := filepath.Join(parentDir, "dealer_motor.db")
		if _, err := os.Stat(altDbPath); err == nil {
			dbPath = altDbPath
		}
	}

	fmt.Printf("📁 Using database path: %s\n", dbPath)

	a.db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return err
	}

	// Check if motors table exists
	var tableExists bool
	var checkTable string
	tableCheckErr := a.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='motors'").Scan(&checkTable)
	tableExists = tableCheckErr == nil

	// Check if table needs migration for new columns
	needsMigration := false
	if tableExists {
		fmt.Println("🔍 Checking database schema version...")

		// Check if new columns exist (check both harga_modal and tahun_motor)
		var hargaModalExists int
		var tahunMotorExists int

		checkErr1 := a.db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('motors') WHERE name='harga_modal'").Scan(&hargaModalExists)
		checkErr2 := a.db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('motors') WHERE name='tahun_motor'").Scan(&tahunMotorExists)

		if checkErr1 != nil || checkErr2 != nil || hargaModalExists == 0 || tahunMotorExists == 0 {
			fmt.Println("⚠️  Missing new columns - needs migration")
			needsMigration = true
		} else {
			fmt.Println("✅ Database schema is up to date")
		}
	}

	// Check and add invoice_number column to transactions table if needed
	var transactionsTableExists int
	a.db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='transactions'").Scan(&transactionsTableExists)

	if transactionsTableExists > 0 {
		var invoiceColumnExists int
		checkInvoiceErr := a.db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('transactions') WHERE name='invoice_number'").Scan(&invoiceColumnExists)

		if checkInvoiceErr == nil && invoiceColumnExists == 0 {
			fmt.Println("🔄 Adding invoice_number column to transactions table...")
			_, addColErr := a.db.Exec("ALTER TABLE transactions ADD COLUMN invoice_number TEXT")
			if addColErr != nil {
				fmt.Printf("❌ Error adding invoice_number column: %v\n", addColErr)
			} else {
				fmt.Println("✅ invoice_number column added successfully")
				// Update existing records with generated invoice numbers
				fmt.Println("🔄 Generating invoice numbers for existing transactions...")
				_, updateErr := a.db.Exec(`
					UPDATE transactions
					SET invoice_number = 'INV/' || strftime('%Y', tanggal_transaksi) || '/' || strftime('%m', tanggal_transaksi) || '/' || printf('%06d', ROWID)
					WHERE invoice_number IS NULL OR invoice_number = ''
				`)
				if updateErr != nil {
					fmt.Printf("❌ Error updating invoice numbers: %v\n", updateErr)
				} else {
					fmt.Println("✅ Invoice numbers generated for existing transactions")
				}
				// Add unique constraint
				fmt.Println("🔄 Adding unique constraint to invoice_number...")
				_, constraintErr := a.db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_invoice_unique ON transactions(invoice_number)")
				if constraintErr != nil {
					fmt.Printf("⚠️  Warning: Could not add unique constraint: %v\n", constraintErr)
				} else {
					fmt.Println("✅ Unique constraint added to invoice_number")
				}
			}
		}
	}

	// Check and add penjual (seller) columns to motors table if needed
	var motorsTableExists int
	a.db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='motors'").Scan(&motorsTableExists)

	if motorsTableExists > 0 {
		// Check for nama_penjual column
		var namaPenjualExists int
		checkNamaErr := a.db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('motors') WHERE name='nama_penjual'").Scan(&namaPenjualExists)

		if checkNamaErr == nil && namaPenjualExists == 0 {
			fmt.Println("🔄 Adding penjual (seller) columns to motors table...")

			_, err1 := a.db.Exec("ALTER TABLE motors ADD COLUMN nama_penjual TEXT")
			_, err2 := a.db.Exec("ALTER TABLE motors ADD COLUMN telepon_penjual TEXT")
			_, err3 := a.db.Exec("ALTER TABLE motors ADD COLUMN alamat_penjual TEXT")

			if err1 != nil || err2 != nil || err3 != nil {
				fmt.Printf("❌ Error adding penjual columns: %v %v %v\n", err1, err2, err3)
			} else {
				fmt.Println("✅ Penjual columns added successfully - existing data preserved!")
			}
		}
	}

	// If migration needed, drop and recreate table
	if needsMigration {
		fmt.Println("🔄 Migrating database schema...")
		fmt.Println("⚠️  WARNING: Dropping old table to update schema. Backup your data if needed!")

		dropSQL := "DROP TABLE IF EXISTS motors"
		_, err := a.db.Exec(dropSQL)
		if err != nil {
			fmt.Printf("❌ Error dropping old table: %v\n", err)
		} else {
			fmt.Println("✅ Old table dropped successfully")
		}
		tableExists = false
	}

	// Create motors table dengan schema baru
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS motors (
		id TEXT PRIMARY KEY,
		nama_motor TEXT NOT NULL,
		nomor_polisi TEXT UNIQUE NOT NULL,
		status TEXT NOT NULL CHECK(status IN ('baru_masuk', 'tersedia', 'terjual', 'dalam_perbaikan')),
		harga_modal REAL NOT NULL DEFAULT 0,
		harga REAL NOT NULL,
		warna TEXT,
		tahun_motor TEXT,
		pajak_date TEXT,
		nama_penjual TEXT,
		telepon_penjual TEXT,
		alamat_penjual TEXT,
		tanggal_masuk DATE NOT NULL,
		tanggal_keluar DATE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_motors_status ON motors(status);
	CREATE INDEX IF NOT EXISTS idx_motors_nomor_polisi ON motors(nomor_polisi);

	-- Table untuk track saldo modal saat ini
	CREATE TABLE IF NOT EXISTS capital (
		id INTEGER PRIMARY KEY CHECK(id = 1), -- Only one row allowed
		current_balance REAL NOT NULL DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Initialize capital dengan saldo 0 jika belum ada
	INSERT OR IGNORE INTO capital (id, current_balance) VALUES (1, 0);

	-- Table untuk track semua transaksi modal (history)
	CREATE TABLE IF NOT EXISTS capital_transactions (
		id TEXT PRIMARY KEY,
		transaction_type TEXT NOT NULL CHECK(transaction_type IN ('add', 'subtract')),
		amount REAL NOT NULL,
		balance_before REAL NOT NULL,
		balance_after REAL NOT NULL,
		description TEXT,
		reference_type TEXT, -- 'motor_purchase', 'manual_add', 'manual_subtract', 'repair' (coming soon)
		reference_id TEXT, -- ID motor jika dari pembelian motor
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_capital_transactions_type ON capital_transactions(transaction_type);
	CREATE INDEX IF NOT EXISTS idx_capital_transactions_reference ON capital_transactions(reference_type, reference_id);
	CREATE INDEX IF NOT EXISTS idx_capital_transactions_date ON capital_transactions(created_at);

	-- Table untuk track transaksi penjualan motor
	CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY,
		invoice_number TEXT UNIQUE NOT NULL,
		motor_id TEXT NOT NULL,
		motor_nama TEXT NOT NULL,
		motor_nomor_polisi TEXT NOT NULL,
		customer_name TEXT NOT NULL,
		customer_phone TEXT NOT NULL,
		customer_address TEXT,
		harga_beli REAL NOT NULL,
		tanggal_transaksi DATE NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (motor_id) REFERENCES motors(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_number);
	CREATE INDEX IF NOT EXISTS idx_transactions_motor ON transactions(motor_id);
	CREATE INDEX IF NOT EXISTS idx_transactions_customer_name ON transactions(customer_name);
	CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);
	CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(tanggal_transaksi);
	`

	_, err = a.db.Exec(createTableSQL)
	if err != nil {
		fmt.Printf("❌ Error creating table: %v\n", err)
		return err
	}

	if needsMigration {
		fmt.Println("✅ Database schema migrated successfully")
	} else if !tableExists {
		fmt.Println("✅ Database schema created successfully")
	} else {
		fmt.Println("✅ Database tables ready")
	}

	// Check if table is empty and seed with sample data if needed
	var count int
	countErr := a.db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&count)
	if countErr != nil {
		fmt.Printf("⚠️  Error checking motor count: %v\n", countErr)
		count = 0
	}

	fmt.Printf("📊 Current motor count: %d\n", count)

	if count == 0 {
		fmt.Println("📝 Seeding database dengan data sample...")
		err := a.seedSampleData()
		if err != nil {
			fmt.Printf("❌ Error seeding data: %v\n", err)
		}
	} else {
		fmt.Println("✅ Database sudah memiliki data, skip seeding")
	}

	return nil
}

// seedSampleData menambahkan 50 data sample yang variatif untuk testing
func (a *App) seedSampleData() error {
	sampleMotors := []struct {
		namaMotor     string
		nomorPolisi   string
		status        string
		hargaModal    float64
		harga         float64
		warna         string
		tahunMotor    string
		pajakDate     string
		tanggalMasuk  string
		tanggalKeluar *string // Use pointer for NULL handling
	}{
		// Status: Tersedia (20 motors)
		{"Honda CB150R", "B 1234 ABC", "tersedia", 13500000, 15000000, "Merah", "2022", "2026", "2024-11-10", nil},
		{"Yamaha NMAX 155", "B 5678 DEF", "tersedia", 16500000, 18500000, "Putih", "2023", "2027", "2024-11-15", nil},
		{"Suzuki GSX-R150", "B 9012 GHI", "tersedia", 20000000, 22500000, "Hitam", "2021", "2025", "2024-11-20", nil},
		{"Honda Vario 160", "B 2468 JKL", "tersedia", 17000000, 19000000, "Abu-abu", "2022", "2026", "2024-12-01", nil},
		{"Yamaha Aerox 155", "B 1357 MNO", "tersedia", 18000000, 20000000, "Biru", "2024", "2028", "2024-12-05", nil},
		{"Suzuki Satria FU", "B 9753 PQR", "tersedia", 11000000, 12500000, "Kuning", "2021", "2025", "2024-12-10", nil},
		{"Kawasaki Ninja 250", "B 8642 STU", "tersedia", 35000000, 38000000, "Hijau", "2023", "2027", "2024-12-12", nil},
		{"Honda PCX 160", "B 7531 VWX", "tersedia", 26000000, 29000000, "Silver", "2024", "2028", "2024-12-15", nil},
		{"Yamaha Mio M3", "B 4826 YZA", "tersedia", 10000000, 11500000, "Pink", "2022", "2026", "2024-12-18", nil},
		{"Suzuki Nex II", "B 3715 BCD", "tersedia", 9500000, 10500000, "Merah", "2021", "2025", "2024-12-20", nil},
		{"Honda Beat Street", "B 6284 EFG", "tersedia", 12000000, 13500000, "Hitam", "2023", "2027", "2024-12-22", nil},
		{"Yamaha Jupiter Z1", "B 9517 HIJ", "tersedia", 11500000, 13000000, "Biru", "2022", "2026", "2024-12-25", nil},
		{"Kawasaki KLX 150", "B 7428 KLM", "tersedia", 22000000, 25000000, "Orange", "2024", "2028", "2024-12-28", nil},
		{"Honda Supra GTR", "B 8539 NOP", "tersedia", 13000000, 14500000, "Merah", "2021", "2025", "2025-01-02", nil},
		{"Yamaha Fino Grande", "B 4261 QRS", "tersedia", 12500000, 14000000, "Putih", "2023", "2027", "2025-01-05", nil},
		{"Suzuki Address", "B 7153 TUV", "tersedia", 11000000, 12500000, "Abu-abu", "2022", "2026", "2025-01-08", nil},
		{"Honda ADV 160", "B 9284 WXY", "tersedia", 28000000, 31000000, "Hitam", "2024", "2028", "2025-01-10", nil},
		{"Yamaha Freego", "B 6173 ZAB", "tersedia", 14000000, 16000000, "Hijau", "2023", "2027", "2025-01-12", nil},
		{"Suzuki Smash", "B 8426 CDE", "tersedia", 8500000, 9500000, "Biru", "2021", "2025", "2025-01-14", nil},
		{"Kawasaki W175", "B 5739 FGH", "tersedia", 24000000, 27000000, "Coklat", "2022", "2026", "2025-01-16", nil},

		// Status: Baru Masuk (12 motors)
		{"Honda CBR150R", "B 1593 IJK", "baru_masuk", 28000000, 31000000, "Merah", "2024", "2028", "2025-01-17", nil},
		{"Yamaha R15 V4", "B 7428 LMN", "baru_masuk", 32000000, 35000000, "Biru", "2024", "2028", "2025-01-18", nil},
		{"Suzuki GSX-S150", "B 9517 OPQ", "baru_masuk", 23000000, 26000000, "Hitam", "2023", "2027", "2025-01-19", nil},
		{"Kawasaki Ninja 400", "B 3571 RST", "baru_masuk", 68000000, 75000000, "Hijau", "2024", "2028", "2025-01-20", nil},
		{"Honda Forza 250", "B 8462 UVW", "baru_masuk", 58000000, 65000000, "Putih", "2024", "2028", "2025-01-21", nil},
		{"Yamaha Lexi 125", "B 6284 XYZ", "baru_masuk", 15500000, 17500000, "Abu-abu", "2023", "2027", "2025-01-22", nil},
		{"Suzuki Burgman", "B 4173 AAA", "baru_masuk", 24500000, 27500000, "Silver", "2024", "2028", "2025-01-23", nil},
		{"Honda CRF150L", "B 9528 BBB", "baru_masuk", 27000000, 30000000, "Orange", "2023", "2027", "2025-01-24", nil},
		{"Yamaha XSR155", "B 7361 CCC", "baru_masuk", 29000000, 32000000, "Merah", "2024", "2028", "2025-01-25", nil},
		{"Suzuki V-Strom", "B 5194 DDD", "baru_masuk", 43000000, 48000000, "Kuning", "2023", "2027", "2025-01-26", nil},
		{"Kawasaki Z250", "B 8273 EEE", "baru_masuk", 42000000, 47000000, "Hijau", "2024", "2028", "2025-01-27", nil},
		{"Honda Genio", "B 6415 FFF", "baru_masuk", 13500000, 15000000, "Pink", "2023", "2027", "2025-01-28", nil},

		// Status: Terjual (14 motors)
		{"Yamaha MX King", "B 2837 GGG", "terjual", 18000000, 20000000, "Biru", "2022", "2026", "2024-09-15", ptrString("2024-12-20")},
		{"Honda Scoopy", "B 9164 HHH", "terjual", 16500000, 18500000, "Putih", "2023", "2027", "2024-09-20", ptrString("2024-12-22")},
		{"Suzuki Smash FI", "B 4719 III", "terjual", 9000000, 10000000, "Merah", "2020", "2024", "2024-08-10", ptrString("2024-12-15")},
		{"Kawasaki Ninja 250SL", "B 8351 JJJ", "terjual", 32000000, 35000000, "Hijau", "2021", "2025", "2024-10-05", ptrString("2025-01-05")},
		{"Honda Wave 110", "B 5926 KKK", "terjual", 8000000, 9000000, "Hitam", "2019", "2023", "2024-07-12", ptrString("2024-11-30")},
		{"Yamaha Soul GT", "B 7483 LLL", "terjual", 10500000, 12000000, "Kuning", "2022", "2026", "2024-10-20", ptrString("2025-01-08")},
		{"Suzuki Shogun", "B 3162 MMM", "terjual", 7500000, 8500000, "Biru", "2019", "2023", "2024-06-25", ptrString("2024-11-15")},
		{"Honda Revo", "B 6847 NNN", "terjual", 10000000, 11500000, "Merah", "2021", "2025", "2024-09-30", ptrString("2024-12-28")},
		{"Yamaha Vega Force", "B 4295 OOO", "terjual", 9500000, 10500000, "Hitam", "2020", "2024", "2024-08-15", ptrString("2024-12-10")},
		{"Suzuki Thunder", "B 9518 PPP", "terjual", 11000000, 12500000, "Biru", "2022", "2026", "2024-10-10", ptrString("2025-01-12")},
		{"Kawasaki Athlete", "B 7361 QQQ", "terjual", 8500000, 9500000, "Hijau", "2019", "2023", "2024-07-05", ptrString("2024-11-20")},
		{"Honda Blade", "B 2674 RRR", "terjual", 7000000, 8000000, "Silver", "2020", "2024", "2024-08-20", ptrString("2024-12-05")},
		{"Yamaha New Vixion", "B 5819 SSS", "terjual", 17000000, 19000000, "Merah", "2023", "2027", "2024-11-01", ptrString("2025-01-15")},
		{"Suzuki Bandit", "B 8432 TTT", "terjual", 12000000, 14000000, "Hitam", "2021", "2025", "2024-09-05", ptrString("2024-12-18")},

		// Status: Dalam Perbaikan (4 motors)
		{"Honda Tiger", "B 6193 UUU", "dalam_perbaikan", 15000000, 17000000, "Hitam", "2020", "2024", "2024-11-25", nil},
		{"Yamaha Scorpio", "B 4758 VVV", "dalam_perbaikan", 13000000, 15000000, "Biru", "2021", "2025", "2024-12-01", nil},
		{"Suzuki Inazuma", "B 9271 WWW", "dalam_perbaikan", 21000000, 24000000, "Merah", "2022", "2026", "2024-12-08", nil},
		{"Kawasaki Versys 650", "B 7524 XXX", "dalam_perbaikan", 85000000, 95000000, "Orange", "2023", "2027", "2024-12-12", nil},
	}

	successCount := 0
	for _, motor := range sampleMotors {
		id := fmt.Sprintf("MTR-%d", time.Now().UnixNano())
		query := `INSERT INTO motors (id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, tanggal_keluar)
		          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

		_, err := a.db.Exec(query, id, motor.namaMotor, motor.nomorPolisi, motor.status, motor.hargaModal, motor.harga, motor.warna, motor.tahunMotor, motor.pajakDate, motor.tanggalMasuk, motor.tanggalKeluar)
		if err != nil {
			fmt.Printf("❌ Error inserting sample motor %s: %v\n", motor.namaMotor, err)
		} else {
			fmt.Printf("✅ Seeded: %s - %s (%s)\n", motor.namaMotor, motor.nomorPolisi, motor.status)
			successCount++
		}

		// Slight delay to ensure unique IDs
		time.Sleep(10 * time.Millisecond)
	}

	fmt.Printf("✅ Database seeding completed! (%d/%d motors seeded)\n", successCount, len(sampleMotors))
	return nil
}

// Helper function to create string pointer
func ptrString(s string) *string {
	return &s
}

// Helper function to check if string contains substring
func contains(str, substr string) bool {
	return len(str) > 0 && len(substr) > 0 &&
		   (str == substr || len(str) >= len(substr) &&
		   (str[:len(substr)] == substr || str[len(str)-len(substr):] == substr ||
		   containsMiddle(str, substr)))
}

// Helper to check substring in middle
func containsMiddle(str, substr string) bool {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Motor CRUD Operations

// AddMotor menambahkan motor baru
func (a *App) AddMotor(namaMotor, nomorPolisi, status string, hargaModal, harga float64, warna, tahunMotor, pajakDate, namaPenjual, teleponPenjual, alamatPenjual, tanggalMasuk string) Response {
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
		"baru_masuk": true, "tersedia": true, "terjual": true, "dalam_perbaikan": true,
	}
	if !validStatus[status] {
		return Response{
			Success: false,
			Message: "Status tidak valid. Pilih: baru_masuk, tersedia, terjual, atau dalam_perbaikan",
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

	// Validasi status terjual harus memiliki tanggal keluar
	if status == "terjual" {
		return Response{
			Success: false,
			Message: "Motor dengan status 'terjual' harus memiliki tanggal keluar. Gunakan fitur Update Status untuk menandai motor terjual.",
		}
	}

	// Generate ID
	id := fmt.Sprintf("MTR-%d", time.Now().UnixNano())

	// Start transaction untuk atomicity (motor + capital)
	tx, err := a.db.Begin()
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal memulai transaksi: " + err.Error(),
		}
	}
	defer tx.Rollback()

	// Check dan kurangi modal jika harga_modal > 0 (pembelian motor)
	var currentBalance, newBalance float64
	var transactionID string
	if hargaModal > 0 {
		// Get current capital balance
		err = tx.QueryRow("SELECT current_balance FROM capital WHERE id = 1").Scan(&currentBalance)
		if err != nil {
			return Response{
				Success: false,
				Message: "Gagal mengecek saldo modal: " + err.Error(),
			}
		}

		// Check if balance sufficient
		if currentBalance < hargaModal {
			return Response{
				Success: false,
				Message: fmt.Sprintf("Saldo modal tidak cukup untuk membeli motor ini.\nSaldo saat ini: Rp %.0f\nHarga beli motor: Rp %.0f\nKekurangan: Rp %.0f",
					currentBalance, hargaModal, hargaModal-currentBalance),
			}
		}

		// Update capital balance
		newBalance = currentBalance - hargaModal
		_, err = tx.Exec("UPDATE capital SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", newBalance)
		if err != nil {
			return Response{
				Success: false,
				Message: "Gagal mengupdate saldo modal: " + err.Error(),
			}
		}

		// Create capital transaction record
		transactionID = fmt.Sprintf("CAP-%d", time.Now().UnixNano())
		description := fmt.Sprintf("Pembelian motor: %s (%s)", namaMotor, nomorPolisi)
		_, err = tx.Exec(`
			INSERT INTO capital_transactions (id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, transactionID, "subtract", hargaModal, currentBalance, newBalance, description, "motor_purchase", id)

		if err != nil {
			return Response{
				Success: false,
				Message: "Gagal mencatat transaksi modal: " + err.Error(),
			}
		}
	}

	// Insert motor ke database
	query := `INSERT INTO motors (id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, nama_penjual, telepon_penjual, alamat_penjual, tanggal_masuk)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = tx.Exec(query, id, namaMotor, nomorPolisi, status, hargaModal, harga, warna, tahunMotor, pajakDate, namaPenjual, teleponPenjual, alamatPenjual, tanggalMasuk)
	if err != nil {
		// Check for UNIQUE constraint violation
		if contains(err.Error(), "UNIQUE constraint failed") || contains(err.Error(), "nomor_polisi") {
			return Response{
				Success: false,
				Message: fmt.Sprintf("Nomor polisi '%s' sudah terdaftar. Gunakan nomor polisi yang berbeda.", nomorPolisi),
			}
		}
		return Response{
			Success: false,
			Message: "Gagal menambahkan motor: " + err.Error(),
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return Response{
			Success: false,
			Message: "Gagal menyimpan data: " + err.Error(),
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
	query := `SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, nama_penjual, telepon_penjual, alamat_penjual, tanggal_masuk, tanggal_keluar, created_at, updated_at
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
		var warna, tahunMotor, pajakDate, namaPenjual, teleponPenjual, alamatPenjual *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.HargaModal, &motor.Harga, &warna, &tahunMotor, &pajakDate,
			&namaPenjual, &teleponPenjual, &alamatPenjual,
			&tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		if warna != nil {
			motor.Warna = *warna
		}
		if tahunMotor != nil {
			motor.TahunMotor = *tahunMotor
		}
		if pajakDate != nil {
			motor.PajakDate = *pajakDate
		}
		if namaPenjual != nil {
			motor.NamaPenjual = *namaPenjual
		}
		if teleponPenjual != nil {
			motor.TeleponPenjual = *teleponPenjual
		}
		if alamatPenjual != nil {
			motor.AlamatPenjual = *alamatPenjual
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
	query := `SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, nama_penjual, telepon_penjual, alamat_penjual, tanggal_masuk, tanggal_keluar, created_at, updated_at
	          FROM motors WHERE id = ?`

	var motor Motor
	var tanggalMasukStr string
	var tanggalKeluar *string
	var warna, tahunMotor, pajakDate, namaPenjual, teleponPenjual, alamatPenjual *string

	err := a.db.QueryRow(query, id).Scan(
		&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
		&motor.HargaModal, &motor.Harga, &warna, &tahunMotor, &pajakDate,
		&namaPenjual, &teleponPenjual, &alamatPenjual,
		&tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	motor.TanggalMasuk = tanggalMasukStr
	if tanggalKeluar != nil {
		motor.TanggalKeluar = *tanggalKeluar
	}
	if warna != nil {
		motor.Warna = *warna
	}
	if tahunMotor != nil {
		motor.TahunMotor = *tahunMotor
	}
	if pajakDate != nil {
		motor.PajakDate = *pajakDate
	}
	if namaPenjual != nil {
		motor.NamaPenjual = *namaPenjual
	}
	if teleponPenjual != nil {
		motor.TeleponPenjual = *teleponPenjual
	}
	if alamatPenjual != nil {
		motor.AlamatPenjual = *alamatPenjual
	}
	return &motor, nil
}

// UpdateMotor mengupdate data motor
func (a *App) UpdateMotor(id, namaMotor, nomorPolisi, status string, hargaModal, harga float64, warna, tahunMotor, pajakDate, namaPenjual, teleponPenjual, alamatPenjual, tanggalMasuk, tanggalKeluar string) Response {
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
				Message: "Format tanggal masuk tidak valid. Gunakan YYYY-MM-DD",
			}
		}
	}

	// Validasi format tanggal keluar jika diisi
	if tanggalKeluar != "" {
		_, err := time.Parse("2006-01-02", tanggalKeluar)
		if err != nil {
			return Response{
				Success: false,
				Message: "Format tanggal keluar tidak valid. Gunakan YYYY-MM-DD",
			}
		}
	}

	// LOGIKA OTOMATIS: Jika tanggal_keluar diisi, otomatis set status = "terjual"
	if tanggalKeluar != "" {
		status = "terjual"
	}

	// Validasi status terjual - cek apakah user mencoba mengubah status menjadi terjual tanpa tanggal keluar
	if status == "terjual" && tanggalKeluar == "" {
		// Cek apakah motor sudah memiliki tanggal_keluar sebelumnya
		var existingTanggalKeluar sql.NullString
		err := a.db.QueryRow("SELECT tanggal_keluar FROM motors WHERE id = ?", id).Scan(&existingTanggalKeluar)
		if err != nil {
			return Response{
				Success: false,
				Message: "Motor tidak ditemukan",
			}
		}

		// Jika tidak ada tanggal_keluar sebelumnya dan user mencoba set status terjual, tolak
		if !existingTanggalKeluar.Valid {
			return Response{
				Success: false,
				Message: "Tidak dapat mengubah status menjadi 'terjual' tanpa tanggal keluar. Silakan isi tanggal keluar terlebih dahulu.",
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
		validStatus := map[string]bool{"baru_masuk": true, "tersedia": true, "terjual": true, "dalam_perbaikan": true}
		if !validStatus[status] {
			return Response{
				Success: false,
				Message: "Status tidak valid",
			}
		}
		query += ", status = ?"
		params = append(params, status)
	}
	if hargaModal > 0 {
		query += ", harga_modal = ?"
		params = append(params, hargaModal)
	}
	if harga > 0 {
		query += ", harga = ?"
		params = append(params, harga)
	}
	if warna != "" {
		query += ", warna = ?"
		params = append(params, warna)
	}
	if tahunMotor != "" {
		query += ", tahun_motor = ?"
		params = append(params, tahunMotor)
	}
	if pajakDate != "" {
		query += ", pajak_date = ?"
		params = append(params, pajakDate)
	}
	if namaPenjual != "" {
		query += ", nama_penjual = ?"
		params = append(params, namaPenjual)
	}
	if teleponPenjual != "" {
		query += ", telepon_penjual = ?"
		params = append(params, teleponPenjual)
	}
	if alamatPenjual != "" {
		query += ", alamat_penjual = ?"
		params = append(params, alamatPenjual)
	}
	if tanggalMasuk != "" {
		query += ", tanggal_masuk = ?"
		params = append(params, tanggalMasuk)
	}

	// Handle tanggal_keluar
	if tanggalKeluar != "" {
		query += ", tanggal_keluar = ?"
		params = append(params, tanggalKeluar)
	} else if status != "" && status != "terjual" {
		// Jika status diubah ke selain terjual, set tanggal_keluar = NULL
		query += ", tanggal_keluar = NULL"
	}

	query += " WHERE id = ?"
	params = append(params, id)

	result, err := a.db.Exec(query, params...)
	if err != nil {
		// Check for UNIQUE constraint violation
		if contains(err.Error(), "UNIQUE constraint failed") || contains(err.Error(), "nomor_polisi") {
			return Response{
				Success: false,
				Message: fmt.Sprintf("Nomor polisi '%s' sudah digunakan oleh motor lain. Gunakan nomor polisi yang berbeda.", nomorPolisi),
			}
		}
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
	validStatus := map[string]bool{"baru_masuk": true, "tersedia": true, "terjual": true, "dalam_perbaikan": true}
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
	sql := `SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, tanggal_keluar, created_at, updated_at
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
		var warna, tahunMotor, pajakDate *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.HargaModal, &motor.Harga, &warna, &tahunMotor, &pajakDate,
			&tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		if warna != nil {
			motor.Warna = *warna
		}
		if tahunMotor != nil {
			motor.TahunMotor = *tahunMotor
		}
		if pajakDate != nil {
			motor.PajakDate = *pajakDate
		}
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// CheckNomorPolisiExists mengecek apakah nomor polisi sudah ada di database
func (a *App) CheckNomorPolisiExists(nomorPolisi string, excludeID string) Response {
	query := `SELECT COUNT(*) FROM motors WHERE nomor_polisi = ? AND id != ?`

	var count int
	err := a.db.QueryRow(query, nomorPolisi, excludeID).Scan(&count)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengecek nomor polisi: " + err.Error(),
		}
	}

	exists := count > 0
	return Response{
		Success: true,
		Data: map[string]interface{}{
			"exists": exists,
			"nomor_polisi": nomorPolisi,
		},
	}
}

// GetMotorsByStatus mengambil motor berdasarkan status
func (a *App) GetMotorsByStatus(status string) Response {
	validStatus := map[string]bool{"baru_masuk": true, "tersedia": true, "terjual": true, "dalam_perbaikan": true}
	if !validStatus[status] {
		return Response{
			Success: false,
			Message: "Status tidak valid",
			Data:    []Motor{},
		}
	}

	query := `SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, tanggal_keluar, created_at, updated_at
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
		var warna, tahunMotor, pajakDate *string

		err := rows.Scan(
			&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status,
			&motor.HargaModal, &motor.Harga, &warna, &tahunMotor, &pajakDate,
			&tanggalMasukStr, &tanggalKeluar, &motor.CreatedAt, &motor.UpdatedAt,
		)
		if err != nil {
			continue
		}

		motor.TanggalMasuk = tanggalMasukStr
		if tanggalKeluar != nil {
			motor.TanggalKeluar = *tanggalKeluar
		}
		if warna != nil {
			motor.Warna = *warna
		}
		if tahunMotor != nil {
			motor.TahunMotor = *tahunMotor
		}
		if pajakDate != nil {
			motor.PajakDate = *pajakDate
		}
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// GetPendapatanBulanan mengambil data pendapatan per bulan dengan modal dan profit (12 bulan terakhir dari year yang dipilih)
func (a *App) GetPendapatanBulanan(year string) Response {
	fmt.Println("🔍 GetPendapatanBulanan: Query dengan modal dan profit...")

	// Default to current year if not specified
	if year == "" {
		year = time.Now().Format("2006")
	}

	// Query dengan JOIN ke transaksi untuk mendapatkan harga_beli yang sebenarnya
	// IMPORTANT: Sinkronisasi dengan tanggal_keluar motor
	query := `
	SELECT
		strftime('%Y-%m', t.tanggal_transaksi) as bulan_tahun,
		strftime('%Y', t.tanggal_transaksi) as tahun,
		strftime('%m', t.tanggal_transaksi) as bulan,
		COUNT(*) as jumlah_terjual,
		COALESCE(SUM(m.harga_modal), 0) as total_modal,
		COALESCE(SUM(t.harga_beli), 0) as total_penjualan,
		COALESCE(SUM(t.harga_beli - m.harga_modal), 0) as total_profit
	FROM transactions t
	INNER JOIN motors m ON t.motor_id = m.id
	WHERE t.tanggal_transaksi IS NOT NULL
	  AND t.tanggal_transaksi != ''
	  AND strftime('%Y', t.tanggal_transaksi) = ?
	  AND m.status = 'terjual'
	  AND m.tanggal_keluar IS NOT NULL
	  AND DATE(t.tanggal_transaksi) = DATE(m.tanggal_keluar)
	GROUP BY strftime('%Y-%m', t.tanggal_transaksi)
	ORDER BY bulan_tahun ASC
	`

	rows, err := a.db.Query(query, year)
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
		var totalModal, totalPenjualan, totalProfit float64

		err := rows.Scan(&bulanTahun, &tahun, &bulan, &jumlahTerjual, &totalModal, &totalPenjualan, &totalProfit)
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
			"total_modal":     totalModal,
			"total_penjualan": totalPenjualan,
			"total_profit":    totalProfit,
		})
	}

	fmt.Printf("📊 GetPendapatanBulanan (Year %s): %d records ditemukan\n", year, len(pendapatanBulanan))
	for i, item := range pendapatanBulanan {
		fmt.Printf("  %d. %s - %d motor - Modal: %.0f, Penjualan: %.0f, Profit: %.0f\n",
			i+1, item["bulan_tahun"], item["jumlah_terjual"], item["total_modal"], item["total_penjualan"], item["total_profit"])
	}

	return Response{
		Success: true,
		Data:    pendapatanBulanan,
		Count:   len(pendapatanBulanan),
	}
}

// GetAvailableYears - Get list of years that have transaction data
func (a *App) GetAvailableYears() Response {
	query := `
	SELECT DISTINCT strftime('%Y', tanggal_transaksi) as year
	FROM transactions
	WHERE tanggal_transaksi IS NOT NULL AND tanggal_transaksi != ''
	ORDER BY year DESC
	`

	rows, err := a.db.Query(query)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil data tahun: " + err.Error(),
		}
	}
	defer rows.Close()

	var years []string
	for rows.Next() {
		var year string
		if err := rows.Scan(&year); err != nil {
			continue
		}
		years = append(years, year)
	}

	// If no years found, return current year
	if len(years) == 0 {
		years = append(years, time.Now().Format("2006"))
	}

	return Response{
		Success: true,
		Data:    years,
		Count:   len(years),
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

// GetFinancialSummary mengambil ringkasan keuangan dengan modal dan profit
func (a *App) GetFinancialSummary() Response {
	// Total modal yang sudah dikeluarkan (dari motor yang tersedia + terjual)
	var totalModalDikeluarkan float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga_modal), 0) FROM motors").Scan(&totalModalDikeluarkan)

	// Total modal saat ini (motor yang belum terjual)
	var totalModalSaatIni float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga_modal), 0) FROM motors WHERE status IN ('baru_masuk', 'tersedia', 'dalam_perbaikan')").Scan(&totalModalSaatIni)

	// Total pendapatan dari penjualan (dari transaksi, bukan dari motors)
	var totalPendapatan float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga_beli), 0) FROM transactions").Scan(&totalPendapatan)

	// Total modal untuk motor yang sudah terjual
	var totalModalTerjual float64
	a.db.QueryRow(`
		SELECT COALESCE(SUM(m.harga_modal), 0)
		FROM motors m
		INNER JOIN transactions t ON m.id = t.motor_id
	`).Scan(&totalModalTerjual)

	// Total profit (penjualan - modal motor terjual)
	totalProfit := totalPendapatan - totalModalTerjual

	// Pendapatan bulan ini
	var pendapatanBulanIni, profitBulanIni float64
	currentMonth := time.Now().Format("2006-01")
	a.db.QueryRow(`
		SELECT
			COALESCE(SUM(t.harga_beli), 0),
			COALESCE(SUM(t.harga_beli - m.harga_modal), 0)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE strftime('%Y-%m', t.tanggal_transaksi) = ?
	`, currentMonth).Scan(&pendapatanBulanIni, &profitBulanIni)

	// Pendapatan bulan lalu
	var pendapatanBulanLalu, profitBulanLalu float64
	lastMonth := time.Now().AddDate(0, -1, 0).Format("2006-01")
	a.db.QueryRow(`
		SELECT
			COALESCE(SUM(t.harga_beli), 0),
			COALESCE(SUM(t.harga_beli - m.harga_modal), 0)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE strftime('%Y-%m', t.tanggal_transaksi) = ?
	`, lastMonth).Scan(&pendapatanBulanLalu, &profitBulanLalu)

	// Persentase perubahan
	persentasePerubahan := 0.0
	if pendapatanBulanLalu > 0 {
		persentasePerubahan = ((pendapatanBulanIni - pendapatanBulanLalu) / pendapatanBulanLalu) * 100
	} else if pendapatanBulanIni > 0 {
		persentasePerubahan = 100.0
	}

	// Hitung rata-rata pengeluaran harian (30 hari terakhir) dari transaksi
	var pengeluaranHarian float64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	a.db.QueryRow(`
		SELECT COALESCE(SUM(harga_beli) / 30.0, 0)
		FROM transactions
		WHERE tanggal_transaksi >= ?
	`, thirtyDaysAgo).Scan(&pengeluaranHarian)

	summary := map[string]interface{}{
		"total_modal_dikeluarkan": totalModalDikeluarkan, // Total modal yang sudah dibeli (semua motor)
		"total_modal":             totalModalSaatIni,      // Modal yang belum kembali (motor belum terjual)
		"total_pendapatan":        totalPendapatan,        // Total uang masuk dari penjualan
		"total_profit":            totalProfit,            // Total keuntungan
		"pendapatan_bulan_ini":    pendapatanBulanIni,
		"profit_bulan_ini":        profitBulanIni,
		"pendapatan_bulan_lalu":   pendapatanBulanLalu,
		"profit_bulan_lalu":       profitBulanLalu,
		"persentase_perubahan":    persentasePerubahan,
		"pengeluaran_harian":      pengeluaranHarian,
		"updated_at":              time.Now().Format("2006-01-02 15:04:05"),
	}

	return Response{
		Success: true,
		Data:    summary,
	}
}

// GetFinancialSummaryByYear mengambil ringkasan keuangan berdasarkan tahun dengan filter
func (a *App) GetFinancialSummaryByYear(tahun string) Response {
	// Total modal yang sudah dikeluarkan untuk tahun tertentu (dari transaksi pembelian motor)
	var totalModalDikeluarkan float64
	a.db.QueryRow(`
		SELECT COALESCE(SUM(harga_modal), 0)
		FROM motors
		WHERE strftime('%Y', tanggal_masuk) = ?
	`, tahun).Scan(&totalModalDikeluarkan)

	// Total modal saat ini (motor yang belum terjual) - tidak di-filter tahun karena ini inventory saat ini
	var totalModalSaatIni float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga_modal), 0) FROM motors WHERE status IN ('baru_masuk', 'tersedia', 'dalam_perbaikan')").Scan(&totalModalSaatIni)

	// Total harga jual inventory (motor yang belum terjual)
	var totalHargaJualInventory float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga), 0) FROM motors WHERE status IN ('baru_masuk', 'tersedia', 'dalam_perbaikan')").Scan(&totalHargaJualInventory)

	// Total harga modal inventory (motor yang belum terjual)
	var totalHargaModalInventory float64
	a.db.QueryRow("SELECT COALESCE(SUM(harga_modal), 0) FROM motors WHERE status IN ('baru_masuk', 'tersedia', 'dalam_perbaikan')").Scan(&totalHargaModalInventory)

	// Total pendapatan dari penjualan untuk tahun tertentu
	var totalPendapatan float64
	a.db.QueryRow(`
		SELECT COALESCE(SUM(harga_beli), 0)
		FROM transactions
		WHERE strftime('%Y', tanggal_transaksi) = ?
	`, tahun).Scan(&totalPendapatan)

	// Total modal untuk motor yang sudah terjual pada tahun tertentu
	var totalModalTerjual float64
	a.db.QueryRow(`
		SELECT COALESCE(SUM(m.harga_modal), 0)
		FROM motors m
		INNER JOIN transactions t ON m.id = t.motor_id
		WHERE strftime('%Y', t.tanggal_transaksi) = ?
	`, tahun).Scan(&totalModalTerjual)

	// Total profit untuk tahun tertentu (penjualan - modal motor terjual)
	totalProfit := totalPendapatan - totalModalTerjual

	// Pendapatan bulan ini (dalam tahun yang dipilih)
	var pendapatanBulanIni, profitBulanIni float64
	currentMonth := time.Now().Format("2006-01")
	currentYear := time.Now().Format("2006")

	// Hanya hitung bulan ini jika tahun yang dipilih adalah tahun sekarang
	if tahun == currentYear {
		a.db.QueryRow(`
			SELECT
				COALESCE(SUM(t.harga_beli), 0),
				COALESCE(SUM(t.harga_beli - m.harga_modal), 0)
			FROM transactions t
			INNER JOIN motors m ON t.motor_id = m.id
			WHERE strftime('%Y-%m', t.tanggal_transaksi) = ?
		`, currentMonth).Scan(&pendapatanBulanIni, &profitBulanIni)
	}

	// Pendapatan bulan lalu (dalam tahun yang dipilih)
	var pendapatanBulanLalu, profitBulanLalu float64
	lastMonth := time.Now().AddDate(0, -1, 0).Format("2006-01")
	lastMonthYear := time.Now().AddDate(0, -1, 0).Format("2006")

	// Hanya hitung bulan lalu jika tahun yang dipilih cocok
	if tahun == currentYear || tahun == lastMonthYear {
		a.db.QueryRow(`
			SELECT
				COALESCE(SUM(t.harga_beli), 0),
				COALESCE(SUM(t.harga_beli - m.harga_modal), 0)
			FROM transactions t
			INNER JOIN motors m ON t.motor_id = m.id
			WHERE strftime('%Y-%m', t.tanggal_transaksi) = ?
		`, lastMonth).Scan(&pendapatanBulanLalu, &profitBulanLalu)
	}

	// Persentase perubahan
	persentasePerubahan := 0.0
	if pendapatanBulanLalu > 0 {
		persentasePerubahan = ((pendapatanBulanIni - pendapatanBulanLalu) / pendapatanBulanLalu) * 100
	} else if pendapatanBulanIni > 0 {
		persentasePerubahan = 100.0
	}

	summary := map[string]interface{}{
		"total_modal_dikeluarkan":      totalModalDikeluarkan,      // Total modal yang sudah dibeli pada tahun tertentu
		"total_modal":                  totalModalSaatIni,          // Modal yang belum kembali (motor belum terjual)
		"total_harga_jual_inventory":   totalHargaJualInventory,    // Total harga jual semua motor di inventory
		"total_harga_modal_inventory":  totalHargaModalInventory,   // Total harga modal semua motor di inventory
		"total_pendapatan":             totalPendapatan,            // Total uang masuk dari penjualan pada tahun tertentu
		"total_profit":                 totalProfit,                // Total keuntungan pada tahun tertentu
		"pendapatan_bulan_ini":         pendapatanBulanIni,
		"profit_bulan_ini":             profitBulanIni,
		"pendapatan_bulan_lalu":        pendapatanBulanLalu,
		"profit_bulan_lalu":            profitBulanLalu,
		"persentase_perubahan":         persentasePerubahan,
		"tahun":                        tahun,
		"updated_at":                   time.Now().Format("2006-01-02 15:04:05"),
	}

	return Response{
		Success: true,
		Data:    summary,
	}
}

// ==================== CAPITAL MANAGEMENT FUNCTIONS ====================

// GetCurrentCapital - mendapatkan saldo modal saat ini
func (a *App) GetCurrentCapital() Response {
	var capital Capital
	err := a.db.QueryRow("SELECT id, current_balance, updated_at FROM capital WHERE id = 1").
		Scan(&capital.ID, &capital.CurrentBalance, &capital.UpdatedAt)

	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil data modal: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Data:    capital,
	}
}

// AddCapital - menambah modal secara manual
func (a *App) AddCapital(amount float64, description string) Response {
	if amount <= 0 {
		return Response{
			Success: false,
			Message: "Jumlah modal harus lebih dari 0",
		}
	}

	// Start transaction
	tx, err := a.db.Begin()
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal memulai transaksi: " + err.Error(),
		}
	}
	defer tx.Rollback()

	// Get current balance
	var currentBalance float64
	err = tx.QueryRow("SELECT current_balance FROM capital WHERE id = 1").Scan(&currentBalance)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil saldo modal: " + err.Error(),
		}
	}

	newBalance := currentBalance + amount

	// Update capital balance
	_, err = tx.Exec("UPDATE capital SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", newBalance)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengupdate saldo modal: " + err.Error(),
		}
	}

	// Create transaction record
	transactionID := fmt.Sprintf("CAP-%d", time.Now().UnixNano())
	_, err = tx.Exec(`
		INSERT INTO capital_transactions (id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, transactionID, "add", amount, currentBalance, newBalance, description, "manual_add", "")

	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mencatat transaksi: " + err.Error(),
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return Response{
			Success: false,
			Message: "Gagal menyimpan transaksi: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: fmt.Sprintf("Berhasil menambah modal sebesar Rp %.0f", amount),
		Data: map[string]interface{}{
			"transaction_id": transactionID,
			"amount":         amount,
			"balance_before": currentBalance,
			"balance_after":  newBalance,
		},
	}
}

// SubtractCapital - mengurangi modal secara manual
func (a *App) SubtractCapital(amount float64, description string) Response {
	if amount <= 0 {
		return Response{
			Success: false,
			Message: "Jumlah pengurangan harus lebih dari 0",
		}
	}

	// Start transaction
	tx, err := a.db.Begin()
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal memulai transaksi: " + err.Error(),
		}
	}
	defer tx.Rollback()

	// Get current balance
	var currentBalance float64
	err = tx.QueryRow("SELECT current_balance FROM capital WHERE id = 1").Scan(&currentBalance)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil saldo modal: " + err.Error(),
		}
	}

	// Check if balance is sufficient
	if currentBalance < amount {
		return Response{
			Success: false,
			Message: fmt.Sprintf("Saldo modal tidak cukup. Saldo saat ini: Rp %.0f, Jumlah pengurangan: Rp %.0f", currentBalance, amount),
		}
	}

	newBalance := currentBalance - amount

	// Update capital balance
	_, err = tx.Exec("UPDATE capital SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", newBalance)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengupdate saldo modal: " + err.Error(),
		}
	}

	// Create transaction record
	transactionID := fmt.Sprintf("CAP-%d", time.Now().UnixNano())
	_, err = tx.Exec(`
		INSERT INTO capital_transactions (id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, transactionID, "subtract", amount, currentBalance, newBalance, description, "manual_subtract", "")

	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mencatat transaksi: " + err.Error(),
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return Response{
			Success: false,
			Message: "Gagal menyimpan transaksi: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: fmt.Sprintf("Berhasil mengurangi modal sebesar Rp %.0f", amount),
		Data: map[string]interface{}{
			"transaction_id": transactionID,
			"amount":         amount,
			"balance_before": currentBalance,
			"balance_after":  newBalance,
		},
	}
}

// GetCapitalTransactions - mendapatkan history transaksi modal
func (a *App) GetCapitalTransactions() Response {
	rows, err := a.db.Query(`
		SELECT id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id, created_at
		FROM capital_transactions
		ORDER BY created_at DESC
	`)

	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil history transaksi: " + err.Error(),
		}
	}
	defer rows.Close()

	// Initialize as empty array to avoid null in JSON
	transactions := make([]CapitalTransaction, 0)
	for rows.Next() {
		var t CapitalTransaction
		err := rows.Scan(&t.ID, &t.TransactionType, &t.Amount, &t.BalanceBefore, &t.BalanceAfter,
			&t.Description, &t.ReferenceType, &t.ReferenceID, &t.CreatedAt)

		if err != nil {
			fmt.Printf("Error scanning transaction: %v\n", err)
			continue
		}

		transactions = append(transactions, t)
	}

	return Response{
		Success: true,
		Data:    transactions,
		Count:   len(transactions),
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

// ========================================
// TRANSACTION MANAGEMENT API
// ========================================

// generateInvoiceNumber - Generate unique invoice number dengan format INV/YYYY/MM/XXXXXX
func (a *App) generateInvoiceNumber(tx *sql.Tx, tanggalTransaksi string) (string, error) {
	// Parse tanggal transaksi
	parsedDate, err := time.Parse("2006-01-02", tanggalTransaksi)
	if err != nil {
		return "", err
	}

	// Format: INV/YYYY/MM
	year := parsedDate.Format("2006")
	month := parsedDate.Format("01")
	prefix := fmt.Sprintf("INV/%s/%s/", year, month)

	// Get count of transactions in the same month
	var count int
	query := `
		SELECT COUNT(*)
		FROM transactions
		WHERE invoice_number LIKE ?
	`
	err = tx.QueryRow(query, prefix+"%").Scan(&count)
	if err != nil {
		return "", err
	}

	// Generate sequential number (6 digits)
	sequence := count + 1
	invoiceNumber := fmt.Sprintf("%s%06d", prefix, sequence)

	return invoiceNumber, nil
}

// GetAvailableMotorsForSale - Get motors yang bisa dijual (status tersedia saja - siap dijual)
func (a *App) GetAvailableMotorsForSale() Response {
	query := `
	SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at
	FROM motors
	WHERE status = 'tersedia'
	ORDER BY nama_motor ASC
	`

	rows, err := a.db.Query(query)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil data motor: " + err.Error(),
		}
	}
	defer rows.Close()

	var motors []Motor
	for rows.Next() {
		var motor Motor
		var tanggalMasuk string
		err := rows.Scan(
			&motor.ID,
			&motor.NamaMotor,
			&motor.NomorPolisi,
			&motor.Status,
			&motor.HargaModal,
			&motor.Harga,
			&motor.Warna,
			&motor.TahunMotor,
			&motor.PajakDate,
			&tanggalMasuk,
			&motor.CreatedAt,
			&motor.UpdatedAt,
		)
		if err != nil {
			continue
		}
		motor.TanggalMasuk = tanggalMasuk
		motors = append(motors, motor)
	}

	return Response{
		Success: true,
		Data:    motors,
		Count:   len(motors),
	}
}

// CreateTransaction - Membuat transaksi penjualan motor
func (a *App) CreateTransaction(motorID, customerName, customerPhone, customerAddress string, hargaBeli float64, tanggalTransaksi string) Response {
	// Validasi input
	if motorID == "" || customerName == "" || customerPhone == "" || hargaBeli <= 0 || tanggalTransaksi == "" {
		return Response{
			Success: false,
			Message: "Data tidak lengkap. Pastikan semua field required diisi.",
		}
	}

	// Start transaction
	tx, err := a.db.Begin()
	if err != nil {
		return Response{
			Success: false,
			Message: "Error memulai transaksi: " + err.Error(),
		}
	}
	defer tx.Rollback()

	// Get motor data dan validasi motor masih tersedia
	var motor Motor
	err = tx.QueryRow(`
		SELECT id, nama_motor, nomor_polisi, status, harga_modal, harga
		FROM motors
		WHERE id = ?
	`, motorID).Scan(&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Status, &motor.HargaModal, &motor.Harga)

	if err == sql.ErrNoRows {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan",
		}
	} else if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil data motor: " + err.Error(),
		}
	}

	// Validasi motor belum terjual
	if motor.Status == "terjual" {
		return Response{
			Success: false,
			Message: "Motor sudah terjual. Silakan pilih motor lain.",
		}
	}

	// Generate transaction ID
	transactionID := fmt.Sprintf("TRX-%d", time.Now().UnixNano())

	// Generate invoice number
	invoiceNumber, err := a.generateInvoiceNumber(tx, tanggalTransaksi)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error generate invoice number: " + err.Error(),
		}
	}

	// Insert transaction record
	_, err = tx.Exec(`
		INSERT INTO transactions (id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, transactionID, invoiceNumber, motorID, motor.NamaMotor, motor.NomorPolisi, customerName, customerPhone, customerAddress, hargaBeli, tanggalTransaksi)

	if err != nil {
		return Response{
			Success: false,
			Message: "Error membuat transaksi: " + err.Error(),
		}
	}

	// Update motor status menjadi 'terjual' dan set tanggal_keluar
	_, err = tx.Exec(`
		UPDATE motors
		SET status = 'terjual', tanggal_keluar = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, tanggalTransaksi, motorID)

	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengupdate status motor: " + err.Error(),
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return Response{
			Success: false,
			Message: "Error menyimpan transaksi: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: fmt.Sprintf("Transaksi berhasil! Motor %s telah terjual kepada %s", motor.NamaMotor, customerName),
		Data: map[string]interface{}{
			"transaction_id": transactionID,
			"invoice_number": invoiceNumber,
			"motor_nama":     motor.NamaMotor,
			"customer_name":  customerName,
		},
	}
}

// GetTransactions - Get all transactions dengan optional filters
func (a *App) GetTransactions() Response {
	query := `
	SELECT id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at
	FROM transactions
	ORDER BY tanggal_transaksi DESC, created_at DESC
	`

	rows, err := a.db.Query(query)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil data transaksi: " + err.Error(),
		}
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var trx Transaction
		err := rows.Scan(
			&trx.ID,
			&trx.InvoiceNumber,
			&trx.MotorID,
			&trx.MotorNama,
			&trx.MotorNomorPolisi,
			&trx.CustomerName,
			&trx.CustomerPhone,
			&trx.CustomerAddress,
			&trx.HargaBeli,
			&trx.TanggalTransaksi,
			&trx.CreatedAt,
			&trx.UpdatedAt,
		)
		if err != nil {
			continue
		}
		transactions = append(transactions, trx)
	}

	return Response{
		Success: true,
		Data:    transactions,
		Count:   len(transactions),
	}
}

// SearchTransactions - Search transactions dengan berbagai filter
func (a *App) SearchTransactions(searchTerm, startDate, endDate string) Response {
	query := `
	SELECT id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at
	FROM transactions
	WHERE 1=1
	`

	var args []interface{}

	// Apply search filter
	if searchTerm != "" {
		query += ` AND (
			customer_name LIKE ? OR
			customer_phone LIKE ? OR
			motor_nama LIKE ? OR
			motor_nomor_polisi LIKE ? OR
			invoice_number LIKE ?
		)`
		searchPattern := "%" + searchTerm + "%"
		args = append(args, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// Apply date range filter
	if startDate != "" && endDate != "" {
		query += ` AND tanggal_transaksi BETWEEN ? AND ?`
		args = append(args, startDate, endDate)
	} else if startDate != "" {
		query += ` AND tanggal_transaksi >= ?`
		args = append(args, startDate)
	} else if endDate != "" {
		query += ` AND tanggal_transaksi <= ?`
		args = append(args, endDate)
	}

	query += ` ORDER BY tanggal_transaksi DESC, created_at DESC`

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error searching transactions: " + err.Error(),
		}
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var trx Transaction
		err := rows.Scan(
			&trx.ID,
			&trx.InvoiceNumber,
			&trx.MotorID,
			&trx.MotorNama,
			&trx.MotorNomorPolisi,
			&trx.CustomerName,
			&trx.CustomerPhone,
			&trx.CustomerAddress,
			&trx.HargaBeli,
			&trx.TanggalTransaksi,
			&trx.CreatedAt,
			&trx.UpdatedAt,
		)
		if err != nil {
			continue
		}
		transactions = append(transactions, trx)
	}

	return Response{
		Success: true,
		Data:    transactions,
		Count:   len(transactions),
	}
}

// ==================== TODAY'S STATISTICS ====================

// GetTodayStats - Get comprehensive statistics for today
func (a *App) GetTodayStats() Response {
	today := time.Now().Format("2006-01-02")

	// Motors sold today (from transactions) - SINKRON dengan tanggal_keluar motor
	var motorsTerjualHariIni int
	var pendapatanHariIni, profitHariIni float64
	a.db.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(t.harga_beli), 0),
			COALESCE(SUM(t.harga_beli - m.harga_modal), 0)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE DATE(t.tanggal_transaksi) = ?
		  AND m.status = 'terjual'
		  AND m.tanggal_keluar IS NOT NULL
		  AND DATE(t.tanggal_transaksi) = DATE(m.tanggal_keluar)
	`, today).Scan(&motorsTerjualHariIni, &pendapatanHariIni, &profitHariIni)

	// Motors purchased/entered today (from motors table) - berdasarkan tanggal_masuk
	var motorsBeliHariIni int
	var modalKeluarHariIni float64
	a.db.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(harga_modal), 0)
		FROM motors
		WHERE DATE(tanggal_masuk) = ?
	`, today).Scan(&motorsBeliHariIni, &modalKeluarHariIni)

	// Capital transactions today (manual add/subtract)
	var modalMasukManual, modalKeluarManual float64
	a.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN transaction_type = 'add' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN transaction_type = 'subtract' AND reference_type = 'manual_subtract' THEN amount ELSE 0 END), 0)
		FROM capital_transactions
		WHERE DATE(created_at) = ?
	`, today).Scan(&modalMasukManual, &modalKeluarManual)

	stats := map[string]interface{}{
		"tanggal":               today,
		"motors_terjual":        motorsTerjualHariIni,
		"pendapatan":            pendapatanHariIni,
		"profit":                profitHariIni,
		"motors_dibeli":         motorsBeliHariIni,
		"modal_keluar_pembelian": modalKeluarHariIni,
		"modal_masuk_manual":    modalMasukManual,
		"modal_keluar_manual":   modalKeluarManual,
		"total_modal_keluar":    modalKeluarHariIni + modalKeluarManual,
		"total_modal_masuk":     modalMasukManual,
		"net_cashflow":          pendapatanHariIni + modalMasukManual - (modalKeluarHariIni + modalKeluarManual),
	}

	return Response{
		Success: true,
		Data:    stats,
	}
}

// GetTodaySoldMotors - Get motors sold today with details - SINKRON dengan tanggal_keluar
func (a *App) GetTodaySoldMotors() Response {
	today := time.Now().Format("2006-01-02")

	query := `
	SELECT
		t.id, t.invoice_number, t.motor_nama, t.motor_nomor_polisi,
		t.customer_name, t.harga_beli, t.tanggal_transaksi,
		m.harga_modal, m.tanggal_keluar,
		(t.harga_beli - m.harga_modal) as profit
	FROM transactions t
	INNER JOIN motors m ON t.motor_id = m.id
	WHERE DATE(t.tanggal_transaksi) = ?
	  AND m.status = 'terjual'
	  AND m.tanggal_keluar IS NOT NULL
	  AND DATE(t.tanggal_transaksi) = DATE(m.tanggal_keluar)
	ORDER BY t.tanggal_transaksi DESC
	`

	rows, err := a.db.Query(query, today)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil motor terjual hari ini: " + err.Error(),
		}
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id, invoiceNumber, motorNama, motorNopol, customerName, tanggalTransaksi, tanggalKeluar string
		var hargaBeli, hargaModal, profit float64

		err := rows.Scan(&id, &invoiceNumber, &motorNama, &motorNopol, &customerName, &hargaBeli, &tanggalTransaksi, &hargaModal, &tanggalKeluar, &profit)
		if err != nil {
			continue
		}

		results = append(results, map[string]interface{}{
			"id":                id,
			"invoice_number":    invoiceNumber,
			"motor_nama":        motorNama,
			"motor_nomor_polisi": motorNopol,
			"customer_name":     customerName,
			"harga_beli":        hargaBeli,
			"harga_modal":       hargaModal,
			"profit":            profit,
			"tanggal_transaksi": tanggalTransaksi,
			"tanggal_keluar":    tanggalKeluar,
		})
	}

	return Response{
		Success: true,
		Data:    results,
		Count:   len(results),
	}
}

// GetTodayPurchasedMotors - Get motors purchased/entered today
func (a *App) GetTodayPurchasedMotors() Response {
	today := time.Now().Format("2006-01-02")

	query := `
	SELECT
		id, nama_motor, nomor_polisi, harga_modal, harga, warna,
		tahun_motor, nama_penjual, status, tanggal_masuk
	FROM motors
	WHERE DATE(tanggal_masuk) = ?
	ORDER BY tanggal_masuk DESC
	`

	rows, err := a.db.Query(query, today)
	if err != nil {
		return Response{
			Success: false,
			Message: "Error mengambil motor dibeli hari ini: " + err.Error(),
		}
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id, namaMotor, nopol, warna, tahunMotor, namaPenjual, status, tanggalMasuk string
		var hargaModal, harga float64

		err := rows.Scan(&id, &namaMotor, &nopol, &hargaModal, &harga, &warna, &tahunMotor, &namaPenjual, &status, &tanggalMasuk)
		if err != nil {
			continue
		}

		results = append(results, map[string]interface{}{
			"id":              id,
			"nama_motor":      namaMotor,
			"nomor_polisi":    nopol,
			"harga_modal":     hargaModal,
			"harga_jual":      harga,
			"warna":           warna,
			"tahun_motor":     tahunMotor,
			"nama_penjual":    namaPenjual,
			"status":          status,
			"tanggal_masuk":   tanggalMasuk,
		})
	}

	return Response{
		Success: true,
		Data:    results,
		Count:   len(results),
	}
}
