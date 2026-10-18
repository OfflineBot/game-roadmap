package api

import (
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"

	"roadmap/internal/store"
)

func Register(app *fiber.App, s *store.Store) {
	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	api.Get("/", index(app))

	api.Get("/milestones", read(s.Milestones))
	api.Post("/milestones", create(s.CreateMilestone))
	api.Patch("/milestones/:id", update(s.UpdateMilestone))
	api.Delete("/milestones/:id", remove(s.DeleteMilestone))
	api.Post("/milestones/:id/move", update(s.MoveMilestone))

	api.Post("/milestones/:id/tasks", createIn(s.CreateTask))
	api.Patch("/tasks/:id", update(s.UpdateTask))
	api.Delete("/tasks/:id", remove(s.DeleteTask))
	api.Post("/tasks/:id/move", update(s.MoveTask))

	api.Get("/categories", read(s.Categories))
	api.Post("/categories", create(s.CreateCategory))
	api.Patch("/categories/:id", update(s.UpdateCategory))
	api.Delete("/categories/:id", remove(s.DeleteCategory))
	api.Post("/categories/:id/move", update(s.MoveCategory))

	api.Post("/categories/:id/checklist", createIn(s.CreateChecklistItem))
	api.Patch("/checklist/:id", update(s.UpdateChecklistItem))
	api.Delete("/checklist/:id", remove(s.DeleteChecklistItem))
	api.Post("/checklist/:id/move", update(s.MoveChecklistItem))

	api.Post("/categories/:id/assets", createIn(s.CreateAsset))
	api.Patch("/assets/:id", update(s.UpdateAsset))
	api.Delete("/assets/:id", remove(s.DeleteAsset))
	api.Post("/assets/:id/move", update(s.MoveAsset))
	api.Put("/assets/:id/check", update(s.SetAssetCheck))

	api.Get("/crates", read(s.Crates))
	api.Post("/crates", create(s.CreateCrate))
	api.Patch("/crates/:id", update(s.UpdateCrate))
	api.Delete("/crates/:id", remove(s.DeleteCrate))
	api.Post("/crates/:id/deps", update(s.AddDependency))
	api.Delete("/crates/:id/deps/:dep", removeIn(s.RemoveDependency))

	api.Get("/bugs", read(s.Bugs))
	api.Post("/bugs", create(s.CreateBug))
	api.Patch("/bugs/:id", update(s.UpdateBug))
	api.Delete("/bugs/:id", remove(s.DeleteBug))

	api.Get("/documents", read(s.Documents))
	api.Post("/documents", create(s.CreateDocument))
	api.Patch("/documents/:id", update(s.UpdateDocument))
	api.Delete("/documents/:id", remove(s.DeleteDocument))
	api.Post("/documents/:id/move", update(s.MoveDocument))
}

// index answers GET /api with every route this build serves, read back from
// the router itself so it cannot drift from what is registered above.
func index(app *fiber.App) fiber.Handler {
	return func(c *fiber.Ctx) error {
		seen := map[string]bool{}
		var routes []string
		for _, r := range app.GetRoutes() {
			line := r.Method + " " + r.Path
			if r.Method == fiber.MethodHead || !strings.HasPrefix(r.Path, "/api") || seen[line] {
				continue
			}
			seen[line] = true
			routes = append(routes, line)
		}
		sort.Strings(routes)
		return c.JSON(fiber.Map{"routes": routes})
	}
}
