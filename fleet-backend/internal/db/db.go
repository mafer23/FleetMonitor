package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Connect() error {
	driver := os.Getenv("DB_DRIVER")
	if driver == "" {
		driver = "sqlite"
	}

	var err error

	switch driver {
	case "postgres":
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			getEnv("DB_HOST", "localhost"),
			getEnv("DB_PORT", "5432"),
			getEnv("DB_USER", "postgres"),
			getEnv("DB_PASS", "postgres"),
			getEnv("DB_NAME", "fleet_db"),
		)
		DB, err = sql.Open("postgres", dsn)

	case "sqlite":
		dbPath := getEnv("SQLITE_PATH", "./fleet.db")
		DB, err = sql.Open("sqlite", dbPath+"?_pragma=foreign_keys(1)")

	default:
		return fmt.Errorf("driver no soportado: %s", driver)
	}

	if err != nil {
		return fmt.Errorf("error abriendo DB: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error conectando a DB: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Printf("✅ Base de datos conectada (%s)", driver)
	return nil
}

func RunMigrations(sqlPath string) error {
	content, err := os.ReadFile(sqlPath)
	if err != nil {
		return fmt.Errorf("error leyendo migraciones: %w", err)
	}

	_, err = DB.Exec(string(content))
	if err != nil {
		return fmt.Errorf("error ejecutando migraciones: %w", err)
	}

	log.Println("✅ Migraciones ejecutadas correctamente")
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
