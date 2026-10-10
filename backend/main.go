package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"

	"roadmap/internal/api"
	"roadmap/internal/db"
	"roadmap/internal/store"
)

func main() {
	conn, err := db.Open(env("DB_PATH", "../data/roadmap.db"))
	if err != nil {
		log.Fatal(err)
	}

	app := fiber.New(fiber.Config{ErrorHandler: api.ErrorHandler})
	api.Register(app, store.New(conn))

	failed := make(chan error, 1)
	go func() { failed <- app.Listen(":" + env("PORT", "8080")) }()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-failed:
		log.Print(err)
	case <-stop:
		// The timeout is needed because idle keep-alive connections of the
		// frontend proxy would otherwise hold the shutdown open.
		if err := app.ShutdownWithTimeout(3 * time.Second); err != nil {
			log.Print(err)
		}
	}

	// Closing checkpoints the write-ahead log, which leaves one complete file
	// on disk that can be copied or backed up as it is.
	if err := conn.Close(); err != nil {
		log.Print(err)
	}
	log.Print("database closed cleanly")
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
