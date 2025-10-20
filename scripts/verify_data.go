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

	fmt.Println("📊 Verification Report:\n")

	// Check motors
	var totalMotors, tersedia, terjual int
	db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&totalMotors)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)

	fmt.Printf("Motors:\n")
	fmt.Printf("  Total: %d\n", totalMotors)
	fmt.Printf("  - Tersedia: %d\n", tersedia)
	fmt.Printf("  - Terjual: %d\n\n", terjual)

	// Check transactions
	var totalTrx int
	db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&totalTrx)
	fmt.Printf("Transactions: %d\n\n", totalTrx)

	// Check data integrity
	var mismatch int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE m.status != 'terjual'
	`).Scan(&mismatch)

	if mismatch > 0 {
		fmt.Printf("⚠️  WARNING: %d motors in transactions are NOT marked as 'terjual'\n\n", mismatch)
	} else {
		fmt.Println("✅ All motors in transactions are properly marked as 'terjual'\n")
	}

	// Check tanggal_keluar matches
	var dateMatch int
	db.QueryRow(`
		SELECT COUNT(*)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE m.tanggal_keluar = t.tanggal_transaksi
	`).Scan(&dateMatch)

	fmt.Printf("✅ %d/%d motors have matching tanggal_keluar with transaction date\n\n", dateMatch, totalTrx)

	// Sample transactions by month
	fmt.Println("Transactions by month:")
	rows, _ := db.Query(`
		SELECT strftime('%m', tanggal_transaksi) as month, COUNT(*) as count
		FROM transactions
		WHERE strftime('%Y', tanggal_transaksi) = '2025'
		GROUP BY month
		ORDER BY month
	`)
	defer rows.Close()

	for rows.Next() {
		var month, count int
		rows.Scan(&month, &count)
		months := []string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
		fmt.Printf("  %s 2025: %d transactions\n", months[month], count)
	}

	fmt.Println("\n✨ Verification complete!")
}
