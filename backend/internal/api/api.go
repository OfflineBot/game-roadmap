// Package api maps HTTP requests onto the store. All validation lives in the
// store, so the handlers here are pure plumbing.
package api

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"roadmap/internal/store"
)

// ErrorHandler turns the store's sentinel errors into status codes.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	switch {
	case errors.Is(err, store.ErrNotFound):
		status = fiber.StatusNotFound
	case errors.Is(err, store.ErrInvalid):
		status = fiber.StatusBadRequest
	}
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		status = fiberErr.Code
	}
	return c.Status(status).JSON(fiber.Map{"error": err.Error()})
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

// The five handler shapes every endpoint of this API fits into.

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
