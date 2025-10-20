package main

import (
	"fmt"
)

// SeedData2025 generates 400 motors and ~250 transactions for year 2025
func (a *App) SeedData2025() Response {
	fmt.Println("🌱 Starting data seeding for 2025...")

	// Step 1: Insert 400 motors
	fmt.Println("📦 Inserting 400 motors...")

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

	_, err := a.db.Exec(sqlMotors)
	if err != nil {
		return Response{
			Success: false,
			Message: fmt.Sprintf("Error inserting motors: %v", err),
		}
	}

	fmt.Println("✅ Successfully inserted 400 motors!")

	// Step 2: Get motors for transactions
	fmt.Println("💰 Creating transactions...")

	rows, err := a.db.Query(`
		SELECT id, harga
		FROM motors
		WHERE status = 'tersedia'
		AND tanggal_masuk >= '2025-01-01'
		ORDER BY RANDOM()
		LIMIT 250
	`)
	if err != nil {
		return Response{
			Success: false,
			Message: fmt.Sprintf("Error fetching motors: %v", err),
		}
	}
	defer rows.Close()

	var motorIDs []string
	var motorPrices []int
	for rows.Next() {
		var id string
		var price int
		if err := rows.Scan(&id, &price); err != nil {
			continue
		}
		motorIDs = append(motorIDs, id)
		motorPrices = append(motorPrices, price)
	}

	// Customer names pool
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

	// Create transactions month by month (Jan-Oct 2025)
	for month := 1; month <= 10; month++ {
		numTrx := 20 + (month % 8) // 20-27 per month

		for i := 0; i < numTrx; i++ {
			if motorIdx >= len(motorIDs) {
				goto DONE
			}

			motorID := motorIDs[motorIdx]
			motorPrice := motorPrices[motorIdx]
			motorIdx++

			// Date in month
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

			// Price with negotiation
			hargaBeli := motorPrice - ((totalTrx % 3) * 500000)

			// Invoice
			invoice := fmt.Sprintf("INV/2025/%02d/%06d", month, totalTrx+1)

			// Insert transaction
			_, err := a.db.Exec(`
				INSERT INTO transactions (invoice_number, motor_id, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`, invoice, motorID, customerName, customerPhone, customerAddress, hargaBeli, trxDate)

			if err != nil {
				continue
			}

			// Update motor
			a.db.Exec(`
				UPDATE motors
				SET status = 'terjual', tanggal_keluar = ?, updated_at = datetime('now')
				WHERE id = ?
			`, trxDate, motorID)

			totalTrx++
		}
	}

DONE:
	fmt.Printf("✅ Created %d transactions!\n", totalTrx)

	// Summary
	var totalMotors, tersedia, terjual, totalTransactions int
	a.db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&totalMotors)
	a.db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	a.db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)
	a.db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&totalTransactions)

	summary := map[string]interface{}{
		"total_motors":       totalMotors,
		"tersedia":           tersedia,
		"terjual":            terjual,
		"total_transactions": totalTransactions,
		"new_motors":         400,
		"new_transactions":   totalTrx,
	}

	return Response{
		Success: true,
		Message: fmt.Sprintf("Seed completed! Added 400 motors and %d transactions", totalTrx),
		Data:    summary,
	}
}
