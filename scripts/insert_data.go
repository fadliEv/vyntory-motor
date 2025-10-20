package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

func main() {
	// Open database
	db, err := sql.Open("sqlite", `C:\Users\IFG Life\Documents\dealer\dealer_motor.db`)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	fmt.Println("🌱 Inserting 400 motors...")

	// SQL untuk insert 400 motors
	sqlMotors := `
INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
SELECT
    CASE (ABS(RANDOM()) % 35)
        WHEN 0 THEN 'Honda Beat' WHEN 1 THEN 'Honda Vario 125' WHEN 2 THEN 'Honda Vario 160'
        WHEN 3 THEN 'Honda Scoopy' WHEN 4 THEN 'Honda PCX' WHEN 5 THEN 'Honda ADV 160'
        WHEN 6 THEN 'Honda CB150R' WHEN 7 THEN 'Honda CBR150R' WHEN 8 THEN 'Honda CRF150L'
        WHEN 9 THEN 'Honda Genio' WHEN 10 THEN 'Yamaha Mio M3' WHEN 11 THEN 'Yamaha Mio S'
        WHEN 12 THEN 'Yamaha Mio Z' WHEN 13 THEN 'Yamaha Aerox 155' WHEN 14 THEN 'Yamaha Lexi'
        WHEN 15 THEN 'Yamaha NMAX' WHEN 16 THEN 'Yamaha XMAX' WHEN 17 THEN 'Yamaha R15'
        WHEN 18 THEN 'Yamaha MT-15' WHEN 19 THEN 'Yamaha Fazzio' WHEN 20 THEN 'Suzuki Nex II'
        WHEN 21 THEN 'Suzuki Address' WHEN 22 THEN 'Suzuki Satria F150' WHEN 23 THEN 'Suzuki GSX-R150'
        WHEN 24 THEN 'Suzuki GSX-S150' WHEN 25 THEN 'Kawasaki Ninja 250' WHEN 26 THEN 'Kawasaki Z250'
        WHEN 27 THEN 'Kawasaki KLX 150' WHEN 28 THEN 'Kawasaki Versys 250' WHEN 29 THEN 'Kawasaki W175'
        WHEN 30 THEN 'Vespa Primavera' WHEN 31 THEN 'Vespa Sprint' WHEN 32 THEN 'Vespa GTS'
        WHEN 33 THEN 'Vespa LX' ELSE 'Vespa S'
    END as nama_motor,
    'B ' || (1000 + (ABS(RANDOM()) % 9000)) || ' ' ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) ||
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ABS(RANDOM()) % 26 + 1, 1) as nomor_polisi,
    'tersedia' as status,
    (10 + (ABS(RANDOM()) % 20)) * 1000000 as harga_modal,
    (12 + (ABS(RANDOM()) % 25)) * 1000000 as harga,
    CASE (ABS(RANDOM()) % 10)
        WHEN 0 THEN 'Hitam' WHEN 1 THEN 'Putih' WHEN 2 THEN 'Merah' WHEN 3 THEN 'Biru' WHEN 4 THEN 'Silver'
        WHEN 5 THEN 'Abu-abu' WHEN 6 THEN 'Kuning' WHEN 7 THEN 'Hijau' WHEN 8 THEN 'Oranye' ELSE 'Coklat'
    END as warna,
    2020 + (ABS(RANDOM()) % 6) as tahun_motor,
    date('2025-01-01', '+' || (ABS(RANDOM()) % 365) || ' days') as pajak_date,
    datetime('2025-01-01', '+' || (ABS(RANDOM()) % 292) || ' days', '+' || (ABS(RANDOM()) % 24) || ' hours') as tanggal_masuk,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM (
    SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) t1, (
    SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) t2
LIMIT 400;
`

	result, err := db.Exec(sqlMotors)
	if err != nil {
		log.Fatal("Error inserting motors:", err)
	}

	affected, _ := result.RowsAffected()
	fmt.Printf("✅ Inserted %d motors\n", affected)

	fmt.Println("💰 Creating transactions...")

	// Get motors untuk dijadikan transaksi
	rows, err := db.Query(`
		SELECT id, nama_motor, nomor_polisi, harga
		FROM motors
		WHERE status = 'tersedia'
		AND tanggal_masuk >= '2025-01-01'
		ORDER BY RANDOM()
		LIMIT 250
	`)
	if err != nil {
		log.Fatal("Error getting motors:", err)
	}

	type Motor struct {
		ID           string
		NamaMotor    string
		NomorPolisi  string
		Harga        int
	}

	var motors []Motor
	for rows.Next() {
		var m Motor
		rows.Scan(&m.ID, &m.NamaMotor, &m.NomorPolisi, &m.Harga)
		motors = append(motors, m)
	}
	rows.Close()

	fmt.Printf("Found %d motors for transactions\n", len(motors))

	// Customer data
	firstNames := []string{
		"Ahmad", "Budi", "Citra", "Dani", "Eka", "Fahmi", "Gita", "Hadi", "Indra", "Joko",
		"Kartika", "Lina", "Maya", "Nina", "Oki", "Putri", "Qori", "Rina", "Sari", "Tono",
	}
	lastNames := []string{
		"Pratama", "Kusuma", "Santoso", "Wijaya", "Putra", "Saputra",
		"Hermawan", "Setiawan", "Gunawan", "Kurniawan",
	}

	totalTrx := 0
	motorIdx := 0

	// Create transactions for each month
	for month := 1; month <= 10; month++ {
		numTrx := 20 + (month % 8)

		for i := 0; i < numTrx; i++ {
			if motorIdx >= len(motors) {
				goto DONE
			}

			motor := motors[motorIdx]
			motorIdx++

			// Random date in month
			daysInMonth := 28
			if month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 {
				daysInMonth = 31
			} else if month == 4 || month == 6 || month == 9 {
				daysInMonth = 30
			}
			if month == 10 {
				daysInMonth = 19
			}

			day := 1 + (totalTrx % daysInMonth)
			hour := 8 + (totalTrx % 12)
			minute := totalTrx % 60

			trxDate := fmt.Sprintf("2025-%02d-%02d %02d:%02d:00", month, day, hour, minute)

			// Customer
			firstName := firstNames[totalTrx%len(firstNames)]
			lastName := lastNames[totalTrx%len(lastNames)]
			customerName := firstName + " " + lastName
			customerPhone := fmt.Sprintf("08%d", 1000000000+(totalTrx*12345)%900000000)
			customerAddress := fmt.Sprintf("Jl. %s No. %d, Jakarta", lastName, (totalTrx%100)+1)

			// Price
			hargaBeli := motor.Harga - ((totalTrx % 3) * 500000)

			// Invoice
			invoice := fmt.Sprintf("INV/2025/%02d/%06d", month, totalTrx+1)

			// Insert transaction
			trxID := uuid.New().String()
			_, err := db.Exec(`
				INSERT INTO transactions (id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`, trxID, invoice, motor.ID, motor.NamaMotor, motor.NomorPolisi, customerName, customerPhone, customerAddress, hargaBeli, trxDate)

			if err != nil {
				fmt.Printf("❌ Error creating transaction: %v\n", err)
				continue
			}

			// Update motor
			db.Exec(`
				UPDATE motors
				SET status = 'terjual', tanggal_keluar = ?, updated_at = datetime('now')
				WHERE id = ?
			`, trxDate, motor.ID)

			totalTrx++
		}

		fmt.Printf("  ✓ Month %d: Created transactions\n", month)
	}

DONE:
	fmt.Printf("✅ Created %d transactions!\n", totalTrx)

	// Summary
	var totalMotors, tersedia, terjual, totalTransactions int
	db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&totalMotors)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)
	db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&totalTransactions)

	fmt.Println("\n📊 Database Summary:")
	fmt.Printf("   Total Motors: %d\n", totalMotors)
	fmt.Printf("   - Tersedia: %d\n", tersedia)
	fmt.Printf("   - Terjual: %d\n", terjual)
	fmt.Printf("   Total Transactions: %d\n", totalTransactions)
}
