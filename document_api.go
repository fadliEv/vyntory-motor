package main

import (
	"database/sql"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// ==================== DOCUMENT MANAGEMENT API ====================

// UploadMotorDocument uploads a document for a motor
func (a *App) UploadMotorDocument(motorID, documentType, fileName, fileDataBase64 string) Response {
	// Validate motor exists
	var exists int
	err := a.db.QueryRow("SELECT COUNT(*) FROM motors WHERE id = ?", motorID).Scan(&exists)
	if err != nil || exists == 0 {
		return Response{
			Success: false,
			Message: "Motor tidak ditemukan",
		}
	}

	// Validate document type
	if !ValidateDocumentType(documentType) {
		return Response{
			Success: false,
			Message: "Tipe dokumen tidak valid",
		}
	}

	// Decode base64 file
	fileBytes, err := DecodeBase64File(fileDataBase64)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal decode file: " + err.Error(),
		}
	}

	// Validate file size
	fileSize := int64(len(fileBytes))
	if fileSize > MAX_FILE_SIZE {
		return Response{
			Success: false,
			Message: fmt.Sprintf("Ukuran file terlalu besar. Maksimal %d MB", MAX_FILE_SIZE/(1024*1024)),
		}
	}

	// Detect MIME type from file bytes
	mimeType := DetectMimeType(fileBytes)
	if !ValidateMimeType(mimeType) {
		return Response{
			Success: false,
			Message: "Tipe file tidak didukung. Hanya PDF, JPG, dan PNG yang diperbolehkan",
		}
	}

	// Check max files per motor
	var fileCount int
	err = a.db.QueryRow("SELECT COUNT(*) FROM motor_documents WHERE motor_id = ?", motorID).Scan(&fileCount)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengecek jumlah dokumen",
		}
	}
	if fileCount >= MAX_FILES_PER_MOTOR {
		return Response{
			Success: false,
			Message: fmt.Sprintf("Maksimal %d dokumen per motor", MAX_FILES_PER_MOTOR),
		}
	}

	// Ensure motor folder exists
	err = a.EnsureMotorFolder(motorID)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal membuat folder dokumen: " + err.Error(),
		}
	}

	// Sanitize filename and add extension
	sanitizedName := SanitizeFileName(fileName)
	ext := GetFileExtension(mimeType)
	if ext == "" {
		ext = filepath.Ext(sanitizedName)
	}
	if ext == "" {
		ext = ".bin"
	}

	// Generate unique filename with timestamp
	timestamp := time.Now().Format("20060102-150405")
	finalFileName := fmt.Sprintf("%s-%s%s", timestamp, sanitizedName, ext)

	// Get full file path
	motorPath := a.GetMotorDocumentsPath(motorID)
	fullPath := filepath.Join(motorPath, finalFileName)

	// Write file to disk
	err = os.WriteFile(fullPath, fileBytes, 0644)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal menyimpan file: " + err.Error(),
		}
	}

	// Store relative path (from documents base)
	basePath := a.GetDocumentsBasePath()
	relativePath, err := filepath.Rel(basePath, fullPath)
	if err != nil {
		relativePath = fullPath // Fallback to full path
	}

	// Generate document ID
	docID := fmt.Sprintf("DOC-%d", time.Now().UnixNano())

	// Insert to database
	query := `INSERT INTO motor_documents (id, motor_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at, created_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	uploadedAt := time.Now()
	_, err = a.db.Exec(query, docID, motorID, documentType, finalFileName, relativePath, fileSize, mimeType, uploadedAt, uploadedAt)
	if err != nil {
		// Cleanup file if database insert fails
		os.Remove(fullPath)
		return Response{
			Success: false,
			Message: "Gagal menyimpan metadata dokumen: " + err.Error(),
		}
	}

	// Return document info
	document := MotorDocument{
		ID:           docID,
		MotorID:      motorID,
		DocumentType: documentType,
		FileName:     finalFileName,
		FilePath:     relativePath,
		FileSize:     fileSize,
		MimeType:     mimeType,
		UploadedAt:   uploadedAt,
		CreatedAt:    uploadedAt,
	}

	return Response{
		Success: true,
		Message: "Dokumen berhasil diupload",
		Data:    document,
	}
}

// DetectMimeType detects MIME type from file bytes
func DetectMimeType(fileBytes []byte) string {
	if len(fileBytes) < 4 {
		return "application/octet-stream"
	}

	// Check PDF signature
	if fileBytes[0] == 0x25 && fileBytes[1] == 0x50 && fileBytes[2] == 0x44 && fileBytes[3] == 0x46 {
		return "application/pdf"
	}

	// Check JPEG signature
	if fileBytes[0] == 0xFF && fileBytes[1] == 0xD8 && fileBytes[2] == 0xFF {
		return "image/jpeg"
	}

	// Check PNG signature
	if fileBytes[0] == 0x89 && fileBytes[1] == 0x50 && fileBytes[2] == 0x4E && fileBytes[3] == 0x47 {
		return "image/png"
	}

	return "application/octet-stream"
}

// GetMotorDocuments retrieves all documents for a motor
func (a *App) GetMotorDocuments(motorID string) Response {
	query := `SELECT id, motor_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at, created_at
	          FROM motor_documents
	          WHERE motor_id = ?
	          ORDER BY uploaded_at DESC`

	rows, err := a.db.Query(query, motorID)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil dokumen: " + err.Error(),
		}
	}
	defer rows.Close()

	var documents []MotorDocument
	for rows.Next() {
		var doc MotorDocument
		err := rows.Scan(&doc.ID, &doc.MotorID, &doc.DocumentType, &doc.FileName, &doc.FilePath, &doc.FileSize, &doc.MimeType, &doc.UploadedAt, &doc.CreatedAt)
		if err != nil {
			continue
		}
		documents = append(documents, doc)
	}

	return Response{
		Success: true,
		Data:    documents,
		Count:   len(documents),
	}
}

// GetMotorDocumentFile retrieves a document file as base64
func (a *App) GetMotorDocumentFile(documentID string) Response {
	// Get document metadata
	var doc MotorDocument
	query := `SELECT id, motor_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at, created_at
	          FROM motor_documents
	          WHERE id = ?`

	err := a.db.QueryRow(query, documentID).Scan(&doc.ID, &doc.MotorID, &doc.DocumentType, &doc.FileName, &doc.FilePath, &doc.FileSize, &doc.MimeType, &doc.UploadedAt, &doc.CreatedAt)
	if err == sql.ErrNoRows {
		return Response{
			Success: false,
			Message: "Dokumen tidak ditemukan",
		}
	} else if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil metadata dokumen: " + err.Error(),
		}
	}

	// Read file from disk
	basePath := a.GetDocumentsBasePath()
	fullPath := filepath.Join(basePath, doc.FilePath)

	fileBytes, err := os.ReadFile(fullPath)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal membaca file: " + err.Error(),
		}
	}

	// Encode to base64
	fileDataBase64 := EncodeToBase64(fileBytes, doc.MimeType)

	return Response{
		Success: true,
		Data: map[string]interface{}{
			"document":  doc,
			"file_data": fileDataBase64,
		},
	}
}

// EncodeToBase64 encodes bytes to base64 data URL
func EncodeToBase64(fileBytes []byte, mimeType string) string {
	encoded := base64.StdEncoding.EncodeToString(fileBytes)
	return fmt.Sprintf("data:%s;base64,%s", mimeType, encoded)
}

// DeleteMotorDocument deletes a document
func (a *App) DeleteMotorDocument(documentID string) Response {
	// Get document metadata
	var doc MotorDocument
	query := `SELECT id, motor_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at, created_at
	          FROM motor_documents
	          WHERE id = ?`

	err := a.db.QueryRow(query, documentID).Scan(&doc.ID, &doc.MotorID, &doc.DocumentType, &doc.FileName, &doc.FilePath, &doc.FileSize, &doc.MimeType, &doc.UploadedAt, &doc.CreatedAt)
	if err == sql.ErrNoRows {
		return Response{
			Success: false,
			Message: "Dokumen tidak ditemukan",
		}
	} else if err != nil {
		return Response{
			Success: false,
			Message: "Gagal mengambil metadata dokumen: " + err.Error(),
		}
	}

	// Delete file from disk
	basePath := a.GetDocumentsBasePath()
	fullPath := filepath.Join(basePath, doc.FilePath)
	err = os.Remove(fullPath)
	if err != nil && !os.IsNotExist(err) {
		fmt.Printf("⚠️ Warning: Failed to delete file %s: %v\n", fullPath, err)
	}

	// Delete from database
	_, err = a.db.Exec("DELETE FROM motor_documents WHERE id = ?", documentID)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal menghapus dokumen dari database: " + err.Error(),
		}
	}

	return Response{
		Success: true,
		Message: "Dokumen berhasil dihapus",
	}
}

// CleanupMotorDocuments deletes all documents for a motor (called when motor is deleted)
func (a *App) CleanupMotorDocuments(motorID string) error {
	// Get all documents for this motor
	var documents []MotorDocument
	query := `SELECT id, motor_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at, created_at
	          FROM motor_documents
	          WHERE motor_id = ?`

	rows, err := a.db.Query(query, motorID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var doc MotorDocument
		err := rows.Scan(&doc.ID, &doc.MotorID, &doc.DocumentType, &doc.FileName, &doc.FilePath, &doc.FileSize, &doc.MimeType, &doc.UploadedAt, &doc.CreatedAt)
		if err != nil {
			continue
		}
		documents = append(documents, doc)
	}

	// Delete all files
	basePath := a.GetDocumentsBasePath()
	for _, doc := range documents {
		fullPath := filepath.Join(basePath, doc.FilePath)
		err := os.Remove(fullPath)
		if err != nil && !os.IsNotExist(err) {
			fmt.Printf("⚠️ Warning: Failed to delete file %s: %v\n", fullPath, err)
		}
	}

	// Delete from database
	_, err = a.db.Exec("DELETE FROM motor_documents WHERE motor_id = ?", motorID)
	if err != nil {
		return err
	}

	// Try to remove motor folder if empty
	motorPath := a.GetMotorDocumentsPath(motorID)
	os.Remove(motorPath) // Ignore error, folder might not be empty

	fmt.Printf("✅ Cleaned up %d documents for motor %s\n", len(documents), motorID)
	return nil
}
