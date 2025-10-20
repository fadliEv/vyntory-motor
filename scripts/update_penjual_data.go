package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	_ "modernc.org/sqlite"
)

// Daftar nama penjual (toko dan perorangan)
var namaPenjual = []string{
	"Toko Motor Jaya",
	"Budi Santoso",
	"CV Motor Sejahtera",
	"Andi Wijaya",
	"Showroom Honda Berkah",
	"Siti Nurhaliza",
	"Motor Murah Abadi",
	"Dedi Firmansyah",
	"Yamaha Center Jakarta",
	"Ibu Ratna",
	"Kawasaki Premium",
	"Pak Bambang",
	"Suzuki Motor Indonesia",
	"Hendra Gunawan",
	"UD Maju Motor",
	"Ani Suryani",
	"Motor Bekas Terpercaya",
	"Agus Setiawan",
	"PT Berkah Motor",
	"Yudi Hermawan",
}

// Daftar area/kota
var areas = []string{
	"Jakarta Selatan",
	"Jakarta Timur",
	"Jakarta Barat",
	"Tangerang",
	"Bekasi",
	"Depok",
	"Bogor",
	"Jakarta Utara",
	"Jakarta Pusat",
	"Bandung",
}

func generatePhoneNumber() string {
	prefixes := []string{"0812", "0813", "0821", "0822", "0852", "0853", "0857", "0858"}
	prefix := prefixes[rand.Intn(len(prefixes))]
	number := rand.Intn(90000000) + 10000000 // 8 digit
	return fmt.Sprintf("%s%d", prefix, number)
}

func generateAddress(area string) string {
	streets := []string{"Jl. Raya Motor", "Jl. Merdeka", "Jl. Sudirman", "Jl. Asia Afrika", "Jl. Gatot Subroto"}
	street := streets[rand.Intn(len(streets))]
	number := rand.Intn(200) + 1
	return fmt.Sprintf("%s No. %d, %s", street, number, area)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Open database
	db, err := sql.Open("sqlite", "C:/Users/IFG Life/Documents/dealer/Sales-motor/dealer_motor.db")
	if err != nil {
		log.Fatal("Error opening database:", err)
	}
	defer db.Close()

	// Get all motors
	rows, err := db.Query("SELECT id, nama_motor FROM motors")
	if err != nil {
		log.Fatal("Error querying motors:", err)
	}
	defer rows.Close()

	var motors []struct {
		ID        string
		NamaMotor string
	}

	for rows.Next() {
		var motor struct {
			ID        string
			NamaMotor string
		}
		if err := rows.Scan(&motor.ID, &motor.NamaMotor); err != nil {
			log.Println("Error scanning:", err)
			continue
		}
		motors = append(motors, motor)
	}

	fmt.Printf("Found %d motors to update\n", len(motors))

	// Update each motor with penjual information
	updateStmt, err := db.Prepare(`
		UPDATE motors
		SET nama_penjual = ?, telepon_penjual = ?, alamat_penjual = ?
		WHERE id = ?
	`)
	if err != nil {
		log.Fatal("Error preparing statement:", err)
	}
	defer updateStmt.Close()

	successCount := 0
	for i, motor := range motors {
		// Select random penjual and area
		nama := namaPenjual[rand.Intn(len(namaPenjual))]
		telepon := generatePhoneNumber()
		area := areas[rand.Intn(len(areas))]
		alamat := generateAddress(area)

		_, err := updateStmt.Exec(nama, telepon, alamat, motor.ID)
		if err != nil {
			log.Printf("Error updating motor %s: %v\n", motor.ID, err)
			continue
		}

		successCount++
		if (i+1)%50 == 0 {
			fmt.Printf("Updated %d/%d motors...\n", i+1, len(motors))
		}
	}

	fmt.Printf("\n✅ Successfully updated %d motors with penjual information!\n", successCount)

	// Verify
	var count int
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE nama_penjual IS NOT NULL AND nama_penjual != ''").Scan(&count)
	fmt.Printf("✅ Total motors with penjual info: %d\n", count)
}
