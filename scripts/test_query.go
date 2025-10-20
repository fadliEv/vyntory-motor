package main

import (
	"database/sql"
	"encoding/json"
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

	fmt.Println("📊 Testing GetPendapatanBulanan query...\n")

	query := `
	SELECT
		strftime('%Y-%m', t.tanggal_transaksi) as bulan_tahun,
		strftime('%Y', t.tanggal_transaksi) as tahun,
		strftime('%m', t.tanggal_transaksi) as bulan,
		COUNT(*) as jumlah_terjual,
		COALESCE(SUM(m.harga_modal), 0) as total_modal,
		COALESCE(SUM(t.harga_beli), 0) as total_penjualan,
		COALESCE(SUM(t.harga_beli - m.harga_modal), 0) as total_profit
	FROM transactions t
	INNER JOIN motors m ON t.motor_id = m.id
	WHERE t.tanggal_transaksi IS NOT NULL AND t.tanggal_transaksi != ''
	GROUP BY strftime('%Y-%m', t.tanggal_transaksi)
	ORDER BY tahun DESC, bulan DESC
	LIMIT 3
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Fatal("Error:", err)
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var bulanTahun, tahun, bulan string
		var jumlahTerjual int
		var totalModal, totalPenjualan, totalProfit float64

		err := rows.Scan(&bulanTahun, &tahun, &bulan, &jumlahTerjual, &totalModal, &totalPenjualan, &totalProfit)
		if err != nil {
			log.Fatal("Scan error:", err)
		}

		result := map[string]interface{}{
			"bulan_tahun":     bulanTahun,
			"tahun":           tahun,
			"bulan":           bulan,
			"jumlah_terjual":  jumlahTerjual,
			"total_modal":     totalModal,
			"total_penjualan": totalPenjualan,
			"total_profit":    totalProfit,
		}

		results = append(results, result)

		fmt.Printf("Bulan: %s\n", bulanTahun)
		fmt.Printf("  Unit Terjual: %d\n", jumlahTerjual)
		fmt.Printf("  Total Modal: %.2f\n", totalModal)
		fmt.Printf("  Total Penjualan: %.2f\n", totalPenjualan)
		fmt.Printf("  Total Profit: %.2f\n", totalProfit)
		fmt.Println()
	}

	// Convert to JSON
	jsonData, _ := json.MarshalIndent(results, "", "  ")
	fmt.Println("\nJSON Output:")
	fmt.Println(string(jsonData))
}
