import type { Express } from "express";
import { createServer, type Server } from "http";
import chatRouter from "./routes/chat";
import { db } from "@db";
import { trips, timelineEntries } from "@db/schema";
import { desc } from "drizzle-orm";
import {
  getTimelineEntries,
  createTimelineEntry,
  updateTimelineEntry,
} from "./controllers/timeline.controller";

export function registerRoutes(app: Express): Server {
  // Core trip management
  app.get("/api/trips", async (req, res) => {
    try {
      const userTrips = await db
        .select()
        .from(trips)
        .orderBy(desc(trips.createdAt));
      res.json(userTrips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      const [trip] = await db
        .insert(trips)
        .values({
          ...req.body,
          status: "planning",
        })
        .returning();
      res.json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  // Timeline management
  app.get("/api/trips/:tripId/timeline", getTimelineEntries);
  app.post("/api/trips/:tripId/timeline", createTimelineEntry);
  app.put("/api/trips/:tripId/timeline/:entryId", updateTimelineEntry);

  // Chat integration
  app.use('/api/chat', chatRouter);

  return createServer(app);
}