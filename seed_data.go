package main

import (
	"database/sql"
	"fmt"
	"math/rand"
	"time"
)

// Seed data untuk simulasi tahun 2025
func SeedData2025(db *sql.DB) error {
	fmt.Println("🌱 Starting data seeding for 2025...")

	// Daftar nama motor populer
	motorNames := []string{
		"Honda Beat", "Honda Vario 125", "Honda Vario 160", "Honda Scoopy", "Honda PCX",
		"Honda ADV 160", "Honda CB150R", "Honda CBR150R", "Honda CRF150L", "Honda Genio",
		"Yamaha Mio M3", "Yamaha Mio S", "Yamaha Mio Z", "Yamaha Aerox 155", "Yamaha Lexi",
		"Yamaha NMAX", "Yamaha XMAX", "Yamaha R15", "Yamaha MT-15", "Yamaha Fazzio",
		"Suzuki Nex II", "Suzuki Address", "Suzuki Satria F150", "Suzuki GSX-R150", "Suzuki GSX-S150",
		"Kawasaki Ninja 250", "Kawasaki Z250", "Kawasaki KLX 150", "Kawasaki Versys 250", "Kawasaki W175",
		"Vespa Primavera", "Vespa Sprint", "Vespa GTS", "Vespa LX", "Vespa S",
	}

	colors := []string{
		"Hitam", "Putih", "Merah", "Biru", "Silver",
		"Abu-abu", "Kuning", "Hijau", "Oranye", "Coklat",
	}

	years := []int{2020, 2021, 2022, 2023, 2024, 2025}

	// 1. Insert 400 motor dengan tanggal masuk tahun 2025
	fmt.Println("📦 Inserting 400 motors...")

	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDateMotor := time.Date(2025, 10, 19, 23, 59, 59, 0, time.UTC) // Sampai hari ini

	for i := 0; i < 400; i++ {
		motorName := motorNames[rand.Intn(len(motorNames))]
		color := colors[rand.Intn(len(colors))]
		year := years[rand.Intn(len(years))]

		// Random tanggal masuk di tahun 2025 (Jan - Oct 19)
		randomDays := rand.Intn(int(endDateMotor.Sub(startDate).Hours() / 24))
		tanggalMasuk := startDate.Add(time.Duration(randomDays) * 24 * time.Hour)

		// Random harga
		hargaModal := (rand.Intn(20) + 10) * 1000000  // 10jt - 30jt
		hargaJual := hargaModal + (rand.Intn(5)+2)*1000000  // markup 2-7jt

		// Nomor polisi random
		nomorPolisi := fmt.Sprintf("B %d %s", rand.Intn(9000)+1000,
			string(rune(65+rand.Intn(26)))+string(rune(65+rand.Intn(26)))+string(rune(65+rand.Intn(26))))

		// Random pajak date (beberapa sudah lewat, beberapa belum)
		pajakDate := time.Date(2025, time.Month(rand.Intn(12)+1), rand.Intn(28)+1, 0, 0, 0, 0, time.UTC)

		query := `
			INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
			VALUES (?, ?, 'tersedia', ?, ?, ?, ?, ?, ?, ?, ?)
		`

		now := time.Now()
		_, err := db.Exec(query, motorName, nomorPolisi, hargaModal, hargaJual, color, year,
			pajakDate.Format("2006-01-02"), tanggalMasuk.Format("2006-01-02 15:04:05"),
			now.Format("2006-01-02 15:04:05"), now.Format("2006-01-02 15:04:05"))

		if err != nil {
			return fmt.Errorf("error inserting motor %d: %v", i+1, err)
		}

		if (i+1)%50 == 0 {
			fmt.Printf("  ✓ Inserted %d motors...\n", i+1)
		}
	}
	fmt.Println("✅ Successfully inserted 400 motors!")

	// 2. Buat transaksi dari Januari - Oktober 2025
	fmt.Println("💰 Creating transactions from Jan-Oct 2025...")

	customerFirstNames := []string{
		"Ahmad", "Budi", "Citra", "Dani", "Eka", "Fahmi", "Gita", "Hadi", "Indra", "Joko",
		"Kartika", "Lina", "Maya", "Nina", "Oki", "Putri", "Qori", "Rina", "Sari", "Tono",
		"Umar", "Vina", "Wati", "Yanti", "Zaki", "Andi", "Bella", "Candra", "Dewi", "Edi",
	}

	customerLastNames := []string{
		"Pratama", "Kusuma", "Santoso", "Wijaya", "Putra", "Putri", "Saputra", "Saputri",
		"Firmansyah", "Hermawan", "Setiawan", "Gunawan", "Kurniawan", "Hidayat", "Rahman",
	}

	// Ambil semua motor yang tersedia untuk transaksi
	rows, err := db.Query("SELECT id, nama_motor, nomor_polisi, harga FROM motors WHERE status = 'tersedia' ORDER BY RANDOM()")
	if err != nil {
		return fmt.Errorf("error fetching available motors: %v", err)
	}
	defer rows.Close()

	var availableMotors []struct {
		ID           string
		NamaMotor    string
		NomorPolisi  string
		Harga        int
	}

	for rows.Next() {
		var motor struct {
			ID           string
			NamaMotor    string
			NomorPolisi  string
			Harga        int
		}
		if err := rows.Scan(&motor.ID, &motor.NamaMotor, &motor.NomorPolisi, &motor.Harga); err != nil {
			return fmt.Errorf("error scanning motor: %v", err)
		}
		availableMotors = append(availableMotors, motor)
	}

	fmt.Printf("  Found %d available motors for transactions\n", len(availableMotors))

	motorIndex := 0
	totalTransactions := 0

	// Loop dari Januari sampai Oktober 2025
	for month := 1; month <= 10; month++ {
		// Random jumlah transaksi per bulan (20-35)
		numTransactions := rand.Intn(16) + 20

		fmt.Printf("  📅 Month %d: Creating %d transactions...\n", month, numTransactions)

		for i := 0; i < numTransactions; i++ {
			// Pastikan masih ada motor tersedia
			if motorIndex >= len(availableMotors) {
				fmt.Printf("  ⚠️  No more available motors. Stopping at %d total transactions.\n", totalTransactions)
				goto DONE
			}

			motor := availableMotors[motorIndex]
			motorIndex++

			// Random tanggal dalam bulan tersebut
			daysInMonth := 28
			if month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 {
				daysInMonth = 31
			} else if month == 4 || month == 6 || month == 9 {
				daysInMonth = 30
			}

			// Untuk bulan Oktober, max tanggal 19
			if month == 10 {
				daysInMonth = 19
			}

			day := rand.Intn(daysInMonth) + 1
			hour := rand.Intn(12) + 8  // 08:00 - 19:59
			minute := rand.Intn(60)

			tanggalTransaksi := time.Date(2025, time.Month(month), day, hour, minute, 0, 0, time.UTC)

			// Generate customer data
			firstName := customerFirstNames[rand.Intn(len(customerFirstNames))]
			lastName := customerLastNames[rand.Intn(len(customerLastNames))]
			customerName := firstName + " " + lastName
			customerPhone := fmt.Sprintf("08%d%d", rand.Intn(90000000)+10000000, rand.Intn(10000))
			customerAddress := fmt.Sprintf("Jl. %s No. %d, Jakarta", lastName, rand.Intn(100)+1)

			// Harga beli customer (bisa nego, -/+ 0-5jt dari harga jual)
			hargaBeli := motor.Harga + (rand.Intn(11)-5)*500000

			// Generate invoice number
			invoiceNumber := fmt.Sprintf("INV/2025/%02d/%06d", month, totalTransactions+1)

			// Insert transaction
			now := time.Now()
			queryTrx := `
				INSERT INTO transactions (invoice_number, motor_id, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`

			_, err := db.Exec(queryTrx, invoiceNumber, motor.ID, customerName, customerPhone, customerAddress, hargaBeli,
				tanggalTransaksi.Format("2006-01-02 15:04:05"),
				now.Format("2006-01-02 15:04:05"), now.Format("2006-01-02 15:04:05"))

			if err != nil {
				return fmt.Errorf("error inserting transaction: %v", err)
			}

			// Update motor status to 'terjual' and set tanggal_keluar
			queryUpdate := `
				UPDATE motors
				SET status = 'terjual', tanggal_keluar = ?, updated_at = ?
				WHERE id = ?
			`

			_, err = db.Exec(queryUpdate, tanggalTransaksi.Format("2006-01-02 15:04:05"),
				now.Format("2006-01-02 15:04:05"), motor.ID)

			if err != nil {
				return fmt.Errorf("error updating motor status: %v", err)
			}

			totalTransactions++
		}

		fmt.Printf("  ✓ Completed month %d\n", month)
	}

DONE:
	fmt.Printf("✅ Successfully created %d transactions from Jan-Oct 2025!\n", totalTransactions)
	fmt.Printf("📊 Remaining available motors: %d\n", len(availableMotors)-motorIndex)

	return nil
}
