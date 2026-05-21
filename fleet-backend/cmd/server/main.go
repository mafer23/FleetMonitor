package main

import (
	"log"
	"net/http"
	"os"

	"github.com/simonmovilidad/fleet-backend/internal/db"
	"github.com/simonmovilidad/fleet-backend/internal/handlers"
	"github.com/simonmovilidad/fleet-backend/internal/websocket"
)

func main() {
	// 1. Conectar base de datos
	if err := db.Connect(); err != nil {
		log.Fatalf("❌ Error conectando a la base de datos: %v", err)
	}

	// 2. Ejecutar migraciones SQL automáticamente
	migrationPath := getEnv("MIGRATIONS_PATH", "./migrations/001_init.sql")
	if err := db.RunMigrations(migrationPath); err != nil {
		log.Fatalf("❌ Error en migraciones: %v", err)
	}

	// 3. Iniciar el Hub de WebSockets en su propia goroutine
	hub := websocket.NewHub()
	go hub.Run()

	// 4. Configurar rutas HTTP
	router := handlers.SetupRouter(hub)

	// 5. Arrancar servidor
	port := getEnv("PORT", "8080")
	log.Printf("🚀 Servidor corriendo en http://localhost:%s", port)
	log.Println("📡 WebSocket disponible en ws://localhost:" + port + "/ws?token=<JWT>")

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("❌ Error iniciando servidor: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
