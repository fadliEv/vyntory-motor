package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"
)

// Session represents a user session
type Session struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Token        string    `json:"token"`
	CreatedAt    time.Time `json:"created_at"`
	ExpiresAt    time.Time `json:"expires_at"`
	LastActivity time.Time `json:"last_activity"`
}

const (
	SessionDuration = 7 * 24 * time.Hour // 7 days
)

// CreateSessionsTable creates the sessions table if it doesn't exist
func (a *App) CreateSessionsTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		token TEXT UNIQUE NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME NOT NULL,
		last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
	CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
	`

	_, err := a.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create sessions table: %v", err)
	}

	return nil
}

// GenerateSessionToken generates a random session token
func GenerateSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateSession creates a new session for a user
func (a *App) CreateSession(userID string) (string, error) {
	token, err := GenerateSessionToken()
	if err != nil {
		return "", fmt.Errorf("failed to generate session token: %v", err)
	}

	sessionID := fmt.Sprintf("SES-%d", time.Now().UnixNano())
	now := time.Now()
	expiresAt := now.Add(SessionDuration)

	query := `
		INSERT INTO sessions (id, user_id, token, created_at, expires_at, last_activity)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err = a.db.Exec(query, sessionID, userID, token, now, expiresAt, now)
	if err != nil {
		return "", fmt.Errorf("failed to create session: %v", err)
	}

	return token, nil
}

// ValidateSession validates a session token and returns the user
func (a *App) ValidateSession(token string) (*User, error) {
	if token == "" {
		return nil, fmt.Errorf("session token is required")
	}

	var session Session
	query := `
		SELECT id, user_id, token, created_at, expires_at, last_activity
		FROM sessions
		WHERE token = ?
	`

	err := a.db.QueryRow(query, token).Scan(
		&session.ID,
		&session.UserID,
		&session.Token,
		&session.CreatedAt,
		&session.ExpiresAt,
		&session.LastActivity,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid session token")
		}
		return nil, err
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) {
		// Delete expired session
		a.db.Exec("DELETE FROM sessions WHERE id = ?", session.ID)
		return nil, fmt.Errorf("session expired")
	}

	// Update last activity
	a.db.Exec("UPDATE sessions SET last_activity = ? WHERE id = ?", time.Now(), session.ID)

	// Get user
	user, err := a.GetUserByID(session.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %v", err)
	}

	// Check if user is active
	if user.Status != "active" {
		return nil, fmt.Errorf("user account is inactive")
	}

	return user, nil
}

// InvalidateSession deletes a session
func (a *App) InvalidateSession(token string) error {
	query := "DELETE FROM sessions WHERE token = ?"
	_, err := a.db.Exec(query, token)
	return err
}

// CleanupExpiredSessions removes all expired sessions
func (a *App) CleanupExpiredSessions() error {
	query := "DELETE FROM sessions WHERE expires_at < ?"
	_, err := a.db.Exec(query, time.Now())
	return err
}

// Login authenticates a user and creates a session
func (a *App) Login(username, password string) Response {
	// Validate input
	if username == "" || password == "" {
		return Response{
			Success: false,
			Message: "Username dan password harus diisi",
		}
	}

	// Get user by username
	user, err := a.GetUserByUsername(username)
	if err != nil {
		return Response{
			Success: false,
			Message: "Username atau password salah",
		}
	}

	// Check if user is active
	if user.Status != "active" {
		return Response{
			Success: false,
			Message: "Akun Anda tidak aktif. Hubungi administrator.",
		}
	}

	// Verify password
	if !VerifyPassword(user.PasswordHash, password) {
		return Response{
			Success: false,
			Message: "Username atau password salah",
		}
	}

	// Create session
	token, err := a.CreateSession(user.ID)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal membuat session. Silakan coba lagi.",
		}
	}

	// Update last login
	a.UpdateLastLogin(user.ID)

	// Return success with token and user info (without password hash)
	return Response{
		Success: true,
		Message: "Login berhasil",
		Data: map[string]interface{}{
			"token": token,
			"user": map[string]interface{}{
				"id":        user.ID,
				"username":  user.Username,
				"email":     user.Email,
				"full_name": user.FullName,
				"role":      user.Role,
				"status":    user.Status,
			},
		},
	}
}

// Logout invalidates a user session
func (a *App) Logout(token string) Response {
	if token == "" {
		return Response{
			Success: false,
			Message: "Session token is required",
		}
	}

	err := a.InvalidateSession(token)
	if err != nil {
		return Response{
			Success: false,
			Message: "Gagal logout. Silakan coba lagi.",
		}
	}

	return Response{
		Success: true,
		Message: "Logout berhasil",
	}
}

// GetCurrentUser returns the current logged-in user info
func (a *App) GetCurrentUser(token string) Response {
	user, err := a.ValidateSession(token)
	if err != nil {
		return Response{
			Success: false,
			Message: "Session tidak valid atau sudah expired",
		}
	}

	return Response{
		Success: true,
		Data: map[string]interface{}{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"full_name": user.FullName,
			"role":      user.Role,
			"status":    user.Status,
		},
	}
}

// CheckPermission checks if a user has a specific permission based on their role
func (a *App) CheckPermission(token, permission string) bool {
	user, err := a.ValidateSession(token)
	if err != nil {
		return false
	}

	// Owner has all permissions
	if user.Role == "owner" {
		return true
	}

	// Karyawan permissions
	karyawanPermissions := map[string]bool{
		"motor.create":       true,
		"motor.read":         true,
		"motor.update":       true,
		"motor.delete":       false, // Cannot delete
		"transaction.create": true,
		"transaction.read":   true,
		"transaction.update": false, // Cannot update
		"transaction.delete": false, // Cannot delete
		"document.upload":    true,
		"document.download":  true,
		"document.delete":    false, // Cannot delete
		"capital.read":       false, // Cannot view capital
		"capital.update":     false,
		"reports.read":       false, // Cannot view reports
		"dashboard.read":     true,
	}

	allowed, exists := karyawanPermissions[permission]
	return exists && allowed
}

// RequirePermission middleware to check permission
func (a *App) RequirePermission(token, permission string) error {
	if !a.CheckPermission(token, permission) {
		return fmt.Errorf("permission denied")
	}
	return nil
}
