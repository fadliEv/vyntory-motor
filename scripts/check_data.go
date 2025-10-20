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

	// Check berapa banyak motor di transactions yang motor_id nya masih 'tersedia'
	var count int
	db.QueryRow(`
		SELECT COUNT(DISTINCT t.motor_id)
		FROM transactions t
		INNER JOIN motors m ON t.motor_id = m.id
		WHERE m.status = 'tersedia'
	`).Scan(&count)

	fmt.Printf("Motors in transactions but still 'tersedia': %d\n", count)

	// Check motors that exist in transactions
	db.QueryRow(`
		SELECT COUNT(DISTINCT t.motor_id)
		FROM transactions t
	`).Scan(&count)

	fmt.Printf("Unique motor_ids in transactions: %d\n", count)

	// Check motors with status terjual
	db.QueryRow(`SELECT COUNT(*) FROM motors WHERE status = 'terjual'`).Scan(&count)
	fmt.Printf("Motors with status 'terjual': %d\n", count)

	// Check total transactions
	db.QueryRow(`SELECT COUNT(*) FROM transactions`).Scan(&count)
	fmt.Printf("Total transactions: %d\n\n", count)

	// Sample data
	fmt.Println("Sample transactions (first 5):")
	rows, _ := db.Query(`
		SELECT t.invoice_number, t.motor_nama, t.customer_name, m.status
		FROM transactions t
		LEFT JOIN motors m ON t.motor_id = m.id
		LIMIT 5
	`)
	defer rows.Close()

	for rows.Next() {
		var invoice, motorName, customer, status sql.NullString
		rows.Scan(&invoice, &motorName, &customer, &status)
		fmt.Printf("  %s | %s | %s | Motor Status: %s\n",
			invoice.String, motorName.String, customer.String, status.String)
	}
}
