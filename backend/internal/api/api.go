// Package api maps HTTP requests onto the store. All validation lives in the
// store, so the handlers here are pure plumbing.
package api

import (
	"errors"
	"fmt"
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"roadmap/internal/store"
)

// ErrorHandler turns the store's sentinel errors into status codes. Unexpected
// failures are logged and answered generically, never echoed to the client.
func ErrorHandler(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, store.ErrNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	case errors.Is(err, store.ErrInvalid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
	}

	log.Printf("%s %s: %v", c.Method(), c.Path(), err)
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal error"})
}

func pathID(c *fiber.Ctx, name string) (int64, error) {
	id, err := strconv.ParseInt(c.Params(name), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%w: %s must be a number", store.ErrInvalid, name)
	}
	return id, nil
}

func parseBody[T any](c *fiber.Ctx) (T, error) {
	var body T
	if err := c.BodyParser(&body); err != nil {
		return body, fmt.Errorf("%w: %s", store.ErrInvalid, err)
	}
	return body, nil
}

// The six handler shapes every endpoint of this API fits into.

func read[T any](fn func() (T, error)) fiber.Handler {
	return func(c *fiber.Ctx) error {
		data, err := fn()
		if err != nil {
			return err
		}
		return c.JSON(data)
	}
}

func create[T any](fn func(T) (int64, error)) fiber.Handler {
	return func(c *fiber.Ctx) error {
		body, err := parseBody[T](c)
		if err != nil {
			return err
		}
		id, err := fn(body)
		if err != nil {
			return err
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
	}
}

func createIn[T any](fn func(int64, T) (int64, error)) fiber.Handler {
	return func(c *fiber.Ctx) error {
		parent, err := pathID(c, "id")
		if err != nil {
			return err
		}
		body, err := parseBody[T](c)
		if err != nil {
			return err
		}
		id, err := fn(parent, body)
		if err != nil {
			return err
		}
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
	}
}

func update[T any](fn func(int64, T) error) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := pathID(c, "id")
		if err != nil {
			return err
		}
		body, err := parseBody[T](c)
		if err != nil {
			return err
		}
		if err := fn(id, body); err != nil {
			return err
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

// removeIn deletes a row that two ids identify together, such as one edge of
// the crate graph.
func removeIn(fn func(int64, int64) error) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := pathID(c, "id")
		if err != nil {
			return err
		}
		child, err := pathID(c, "dep")
		if err != nil {
			return err
		}
		if err := fn(id, child); err != nil {
			return err
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}

func remove(fn func(int64) error) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := pathID(c, "id")
		if err != nil {
			return err
		}
		if err := fn(id); err != nil {
			return err
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}
