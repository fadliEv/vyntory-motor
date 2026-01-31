package main

import (
	"encoding/base64"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// ==================== Document Management Helper Functions ====================

// ValidateDocumentType checks if document type is valid
func ValidateDocumentType(docType string) bool {
	validTypes := map[string]bool{
		DOC_TYPE_BPKB:     true,
		DOC_TYPE_STNK:     true,
		DOC_TYPE_FAKTUR:   true,
		DOC_TYPE_KWITANSI: true,
		DOC_TYPE_KTP:      true,
		DOC_TYPE_FOTO:     true,
		DOC_TYPE_LAINNYA:  true,
	}
	return validTypes[docType]
}

// ValidateMimeType checks if MIME type is allowed
func ValidateMimeType(mimeType string) bool {
	allowedTypes := map[string]bool{
		"application/pdf": true,
		"image/jpeg":      true,
		"image/jpg":       true,
		"image/png":       true,
	}
	return allowedTypes[mimeType]
}

// GetMimeTypeFromBase64 extracts MIME type from base64 data URL
func GetMimeTypeFromBase64(base64Data string) string {
	// Check for data URL prefix
	if strings.HasPrefix(base64Data, "data:") {
		parts := strings.Split(base64Data, ";")
		if len(parts) > 0 {
			mimeType := strings.TrimPrefix(parts[0], "data:")
			return mimeType
		}
	}
	return ""
}

// DecodeBase64File decodes base64 string to bytes
func DecodeBase64File(base64Data string) ([]byte, error) {
	// Remove data URL prefix if present
	if strings.Contains(base64Data, ",") {
		parts := strings.Split(base64Data, ",")
		if len(parts) > 1 {
			base64Data = parts[1]
		}
	}

	// Decode base64
	fileBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	return fileBytes, nil
}

// SanitizeFileName removes unsafe characters from filename
func SanitizeFileName(filename string) string {
	// Remove path separators and other unsafe characters
	reg := regexp.MustCompile(`[<>:"/\\|?*\x00-\x1f]`)
	sanitized := reg.ReplaceAllString(filename, "_")

	// Limit length
	if len(sanitized) > 200 {
		ext := filepath.Ext(sanitized)
		name := sanitized[:200-len(ext)]
		sanitized = name + ext
	}

	return sanitized
}

// GetFileExtension returns file extension from MIME type
func GetFileExtension(mimeType string) string {
	extensions := map[string]string{
		"application/pdf": ".pdf",
		"image/jpeg":      ".jpg",
		"image/jpg":       ".jpg",
		"image/png":       ".png",
	}

	if ext, ok := extensions[mimeType]; ok {
		return ext
	}
	return ""
}
