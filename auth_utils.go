package main

import (
	"database/sql"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system
type User struct {
	ID           string     `json:"id"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // Don't expose password hash in JSON
	FullName     string     `json:"full_name"`
	Role         string     `json:"role"`   // 'owner' or 'karyawan'
	Status       string     `json:"status"` // 'active' or 'inactive'
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastLogin    *time.Time `json:"last_login,omitempty"`
}

// HashPassword hashes a plain text password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// VerifyPassword checks if the provided password matches the hash
func VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// CreateUsersTable creates the users table if it doesn't exist
func (a *App) CreateUsersTable() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		full_name TEXT NOT NULL,
		role TEXT NOT NULL CHECK(role IN ('owner', 'karyawan')),
		status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_login DATETIME
	);

	CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
	CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
	`

	_, err := a.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create users table: %v", err)
	}

	return nil
}

// SeedUsers creates default admin and karyawan users if they don't exist
func (a *App) SeedUsers() error {
	// Check if users already exist
	var count int
	err := a.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}

	// If users already exist, skip seeding
	if count > 0 {
		fmt.Println("✅ Users already exist, skipping seeder")
		return nil
	}

	fmt.Println("🌱 Seeding default users...")

	// Create admin user
	adminPassword, err := HashPassword("admin123")
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %v", err)
	}

	adminQuery := `
		INSERT INTO users (id, username, email, password_hash, full_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	now := time.Now()
	_, err = a.db.Exec(adminQuery,
		"USR-ADMIN-001",
		"admin",
		"admin@vyntorymotor.com",
		adminPassword,
		"Administrator",
		"owner",
		"active",
		now,
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}

	// Create karyawan user
	karyawanPassword, err := HashPassword("karyawan123")
	if err != nil {
		return fmt.Errorf("failed to hash karyawan password: %v", err)
	}

	karyawanQuery := `
		INSERT INTO users (id, username, email, password_hash, full_name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err = a.db.Exec(karyawanQuery,
		"USR-KARYAWAN-001",
		"karyawan",
		"karyawan@vyntorymotor.com",
		karyawanPassword,
		"Staff Karyawan",
		"karyawan",
		"active",
		now,
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to create karyawan user: %v", err)
	}

	fmt.Println("✅ Seeded 2 users:")
	fmt.Println("   👤 Admin - username: admin, password: admin123")
	fmt.Println("   👤 Karyawan - username: karyawan, password: karyawan123")

	return nil
}

// GetUserByUsername retrieves a user by username
func (a *App) GetUserByUsername(username string) (*User, error) {
	var user User
	query := `
		SELECT id, username, email, password_hash, full_name, role, status, created_at, updated_at, last_login
		FROM users
		WHERE username = ?
	`

	var lastLogin sql.NullTime
	err := a.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Role,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
		&lastLogin,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}

	if lastLogin.Valid {
		user.LastLogin = &lastLogin.Time
	}

	return &user, nil
}

// UpdateLastLogin updates the last login timestamp for a user
func (a *App) UpdateLastLogin(userID string) error {
	query := `UPDATE users SET last_login = ? WHERE id = ?`
	_, err := a.db.Exec(query, time.Now(), userID)
	return err
}
