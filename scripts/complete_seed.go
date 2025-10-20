package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", `C:\Users\IFG Life\Documents\dealer\Sales-motor\dealer_motor.db`)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	fmt.Println("🗑️  Step 1: Cleaning ALL existing data...")

	// Delete ALL transactions first (foreign key constraint)
	result, _ := db.Exec("DELETE FROM transactions")
	affected, _ := result.RowsAffected()
	fmt.Printf("  ✓ Deleted %d transactions\n", affected)

	// Delete ALL motors
	result, _ = db.Exec("DELETE FROM motors")
	affected, _ = result.RowsAffected()
	fmt.Printf("  ✓ Deleted %d motors\n", affected)

	fmt.Println("\n🌱 Step 2: Inserting 400 new motors...")

	motorNames := []string{
		"Honda Beat", "Honda Vario 125", "Honda Vario 160", "Honda Scoopy", "Honda PCX",
		"Honda ADV 160", "Honda CB150R", "Honda CBR150R", "Honda CRF150L", "Honda Genio",
		"Yamaha Mio M3", "Yamaha Mio S", "Yamaha Mio Z", "Yamaha Aerox 155", "Yamaha Lexi",
		"Yamaha NMAX", "Yamaha XMAX", "Yamaha R15", "Yamaha MT-15", "Yamaha Fazzio",
		"Suzuki Nex II", "Suzuki Address", "Suzuki Satria F150", "Suzuki GSX-R150", "Suzuki GSX-S150",
		"Kawasaki Ninja 250", "Kawasaki Z250", "Kawasaki KLX 150", "Kawasaki Versys 250", "Kawasaki W175",
		"Vespa Primavera", "Vespa Sprint", "Vespa GTS", "Vespa LX", "Vespa S",
	}

	colors := []string{"Hitam", "Putih", "Merah", "Biru", "Silver", "Abu-abu", "Kuning", "Hijau", "Oranye", "Coklat"}

	insertedMotors := 0
	for i := 0; i < 400; i++ {
		motorID := uuid.New().String()
		nama := motorNames[i%len(motorNames)]
		nopol := fmt.Sprintf("B %d %s", 5000+i, string(rune(65+(i%26)))+string(rune(65+((i/26)%26)))+string(rune(65+((i/676)%26))))
		warna := colors[i%len(colors)]
		tahun := 2020 + (i % 6)
		hargaModal := (10 + (i % 20)) * 1000000
		hargaJual := (12 + (i % 25)) * 1000000

		// Random days in 2025 (1-292 days from Jan 1)
		daysOffset := i % 292

		_, err := db.Exec(`
			INSERT INTO motors (id, nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
			VALUES (?, ?, ?, 'tersedia', ?, ?, ?, ?, date('2025-01-01', '+' || ? || ' days'), datetime('2025-01-01', '+' || ? || ' days', '+' || ? || ' hours'), datetime('now'), datetime('now'))
		`, motorID, nama, nopol, hargaModal, hargaJual, warna, tahun, (i*7)%365, daysOffset, (i%12)+8)

		if err != nil {
			log.Printf("Error insert motor %d: %v\n", i+1, err)
			continue
		}
		insertedMotors++

		if (i+1)%50 == 0 {
			fmt.Printf("  ✓ Inserted %d motors...\n", i+1)
		}
	}

	fmt.Printf("\n✅ Total inserted: %d motors\n", insertedMotors)

	fmt.Println("\n💰 Step 3: Creating transactions (Jan-Oct 2025)...")

	// Get all motors
	rows, err := db.Query(`
		SELECT id, nama_motor, nomor_polisi, harga
		FROM motors
		WHERE status = 'tersedia'
		ORDER BY tanggal_masuk
	`)
	if err != nil {
		log.Fatal("Error getting motors:", err)
	}

	type Motor struct {
		ID          string
		Nama        string
		Nopol       string
		Harga       float64
	}

	var motors []Motor
	for rows.Next() {
		var m Motor
		err := rows.Scan(&m.ID, &m.Nama, &m.Nopol, &m.Harga)
		if err != nil {
			log.Fatal("Scan error:", err)
		}
		motors = append(motors, m)
	}
	rows.Close()

	fmt.Printf("  Found %d motors available for transactions\n", len(motors))

	if len(motors) == 0 {
		log.Fatal("No motors found! Cannot create transactions.")
	}

	// Customer names
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

	// Create transactions month by month
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
			hargaBeli := int(motor.Harga) - ((totalTrx % 3) * 500000)

			// Invoice
			invoice := fmt.Sprintf("INV/2025/%02d/%06d", month, totalTrx+1)

			// Insert transaction
			trxID := uuid.New().String()
			_, err := db.Exec(`
				INSERT INTO transactions (id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
			`, trxID, invoice, motor.ID, motor.Nama, motor.Nopol, customerName, customerPhone, customerAddress, hargaBeli, trxDate)

			if err != nil {
				log.Printf("❌ Error creating transaction: %v\n", err)
				continue
			}

			// Update motor status
			_, err = db.Exec(`
				UPDATE motors
				SET status = 'terjual', tanggal_keluar = ?, updated_at = datetime('now')
				WHERE id = ?
			`, trxDate, motor.ID)

			if err != nil {
				log.Printf("❌ Error updating motor status: %v\n", err)
			}

			totalTrx++
		}

		fmt.Printf("  ✓ Month %d: %d transactions created\n", month, numTrx)
	}

DONE:
	fmt.Printf("\n✅ Total transactions created: %d\n", totalTrx)

	// Final summary
	var totalMotors, tersedia, terjual, baruMasuk, totalTransactions int
	db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&totalMotors)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'baru_masuk'").Scan(&baruMasuk)
	db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&totalTransactions)

	fmt.Println("\n📊 Final Database Summary:")
	fmt.Printf("   Total Motors: %d\n", totalMotors)
	fmt.Printf("   - Tersedia: %d\n", tersedia)
	fmt.Printf("   - Terjual: %d\n", terjual)
	fmt.Printf("   - Baru Masuk: %d\n", baruMasuk)
	fmt.Printf("   Total Transactions: %d\n", totalTransactions)

	fmt.Println("\n✨ Seeding complete! Refresh aplikasi untuk melihat data baru.")
}
