package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	// Open database
	db, err := sql.Open("sqlite", `C:\Users\IFG Life\Documents\dealer\dealer_motor.db`)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	fmt.Println("🔧 Fixing motor status based on transactions...")

	// Update motors yang ada di transactions tapi statusnya masih 'tersedia'
	result, err := db.Exec(`
		UPDATE motors
		SET status = 'terjual',
		    tanggal_keluar = (
		        SELECT tanggal_transaksi
		        FROM transactions
		        WHERE transactions.motor_id = motors.id
		        LIMIT 1
		    ),
		    updated_at = datetime('now')
		WHERE id IN (
		    SELECT DISTINCT motor_id
		    FROM transactions
		)
		AND status != 'terjual'
	`)

	if err != nil {
		log.Fatal("Error updating motor status:", err)
	}

	affected, _ := result.RowsAffected()
	fmt.Printf("✅ Updated %d motors to 'terjual' status\n", affected)

	// Summary
	var totalMotors, tersedia, terjual, totalTransactions int
	db.QueryRow("SELECT COUNT(*) FROM motors").Scan(&totalMotors)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'tersedia'").Scan(&tersedia)
	db.QueryRow("SELECT COUNT(*) FROM motors WHERE status = 'terjual'").Scan(&terjual)
	db.QueryRow("SELECT COUNT(*) FROM transactions").Scan(&totalTransactions)

	fmt.Println("\n📊 Updated Database Summary:")
	fmt.Printf("   Total Motors: %d\n", totalMotors)
	fmt.Printf("   - Tersedia: %d\n", tersedia)
	fmt.Printf("   - Terjual: %d\n", terjual)
	fmt.Printf("   Total Transactions: %d\n", totalTransactions)
}
