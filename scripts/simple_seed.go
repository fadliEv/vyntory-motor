package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

func main() {
	db, _ := sql.Open("sqlite", `C:\Users\IFG Life\Documents\dealer\dealer_motor.db`)
	defer db.Close()

	// Delete all 2025 data first
	db.Exec("DELETE FROM transactions WHERE invoice_number LIKE 'INV/2025/%'")
	db.Exec("DELETE FROM motors WHERE tanggal_masuk >= '2025-01-01'")

	fmt.Println("✅ Cleaned old data\n")

	// Insert 400 motors dengan loop biasa saja (lebih reliable)
	fmt.Println("📦 Inserting 400 motors...")

	motorNames := []string{
		"Honda Beat", "Honda Vario 125", "Honda Vario 160", "Honda Scoopy", "Honda PCX",
		"Yamaha Mio", "Yamaha NMAX", "Yamaha Aerox", "Yamaha R15", "Yamaha MT-15",
		"Suzuki Nex", "Suzuki Address", "Suzuki GSX", "Kawasaki Ninja", "Vespa Sprint",
	}

	colors := []string{"Hitam", "Putih", "Merah", "Biru", "Silver"}

	for i := 0; i < 400; i++ {
		nama := motorNames[i%len(motorNames)]
		warna := colors[i%len(colors)]
		hargaModal := (15 + (i % 15)) * 1000000
		hargaJual := hargaModal + 3000000
		nopol := fmt.Sprintf("B %d ABC", 1000+i)
		tahun := 2020 + (i % 6)

		_, err := db.Exec(`
			INSERT INTO motors (nama_motor, nomor_polisi, status, harga_modal, harga, warna, tahun_motor, pajak_date, tanggal_masuk, created_at, updated_at)
			VALUES (?, ?, 'tersedia', ?, ?, ?, ?, '2025-06-15', '2025-01-15 10:00:00', datetime('now'), datetime('now'))
		`, nama, nopol, hargaModal, hargaJual, warna, tahun)

		if err != nil {
			log.Printf("Error insert motor %d: %v\n", i, err)
		}
	}

	fmt.Println("✅ Inserted 400 motors\n")

	// Get motors
	fmt.Println("💰 Creating 231 transactions...")

	rows, _ := db.Query(`SELECT id, nama_motor, nomor_polisi, harga FROM motors WHERE status = 'tersedia' AND tanggal_masuk >= '2025-01-01' LIMIT 250`)

	type Motor struct {
		ID, Nama, Nopol string
		Harga           int
	}

	var motors []Motor
	for rows.Next() {
		var m Motor
		if err := rows.Scan(&m.ID, &m.Nama, &m.Nopol, &m.Harga); err != nil {
			log.Fatal("Scan error:", err)
		}
		motors = append(motors, m)
	}
	rows.Close()

	fmt.Printf("  Found %d motors\n", len(motors))

	// Create 231 transactions
	names := []string{"Ahmad", "Budi", "Citra", "Dani", "Eka"}

	for i := 0; i < 231 && i < len(motors); i++ {
		m := motors[i]
		trxID := uuid.New().String()
		invoice := fmt.Sprintf("INV/2025/01/%06d", i+1)
		customer := names[i%len(names)] + " Customer"
		phone := fmt.Sprintf("0812345%05d", i)
		trxDate := fmt.Sprintf("2025-01-%02d 10:00:00", (i%28)+1)

		_, err := db.Exec(`
			INSERT INTO transactions (id, invoice_number, motor_id, motor_nama, motor_nomor_polisi, customer_name, customer_phone, customer_address, harga_beli, tanggal_transaksi, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'Jakarta', ?, ?, datetime('now'), datetime('now'))
		`, trxID, invoice, m.ID, m.Nama, m.Nopol, customer, phone, m.Harga, trxDate)

		if err != nil {
			log.Fatal("Insert trx error:", err)
		}

		// Update motor
		db.Exec("UPDATE motors SET status = 'terjual', tanggal_keluar = ?, updated_at = datetime('now') WHERE id = ?", trxDate, m.ID)
	}

	fmt.Println("✅ Created 231 transactions\n")

	// Summary
	var total, tersedia, terjual, trxCount int
	db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&total)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)
	db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&trxCount)

	fmt.Println("📊 Summary:")
	fmt.Printf("   Motors: %d (Tersedia: %d, Terjual: %d)\n", total, tersedia, terjual)
	fmt.Printf("   Transactions: %d\n", trxCount)
}
