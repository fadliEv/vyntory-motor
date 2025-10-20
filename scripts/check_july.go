package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", `C:\Users\IFG Life\Documents\dealer\dealer_motor.db`)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	fmt.Println("📊 Checking motors sold in July 2025...\n")

	// Count motors sold in July
	var count int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM motors
		WHERE status = 'terjual'
		AND tanggal_keluar >= '2025-07-01'
		AND tanggal_keluar < '2025-08-01'
	`).Scan(&count)

	fmt.Printf("Motors sold in July 2025: %d\n\n", count)

	// Show sample data
	if count > 0 {
		fmt.Println("Sample motors sold in July:")
		rows, _ := db.Query(`
			SELECT nama_motor, nomor_polisi, tanggal_keluar
			FROM motors
			WHERE status = 'terjual'
			AND tanggal_keluar >= '2025-07-01'
			AND tanggal_keluar < '2025-08-01'
			LIMIT 5
		`)
		defer rows.Close()

		for rows.Next() {
			var nama, nopol, tglKeluar string
			rows.Scan(&nama, &nopol, &tglKeluar)
			fmt.Printf("  - %s (%s) - Terjual: %s\n", nama, nopol, tglKeluar)
		}
	}
}
