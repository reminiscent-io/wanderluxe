import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import chatRouter from "./routes/chat";
import { db } from "@db";
import { trips, messages, files, timelineEntries } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import {
  getTimelineEntries,
  createTimelineEntry,
  updateTimelineEntry,
} from "./controllers/timeline.controller";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export function registerRoutes(app: Express): Server {
  // Trips
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
        })
        .returning();
      res.json(trip);
    } catch (error) {
      console.error("Error creating trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  // Timeline Entries
  app.get("/api/trips/:tripId/timeline", getTimelineEntries);
  app.post("/api/trips/:tripId/timeline", createTimelineEntry);
  app.put("/api/trips/:tripId/timeline/:entryId", updateTimelineEntry);

  // Messages
  app.use('/api/chat', chatRouter);

  app.get("/api/trips/:tripId/messages", async (req, res) => {
    try {
      const tripMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.tripId, parseInt(req.params.tripId)))
        .orderBy(desc(messages.createdAt));
      res.json(tripMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Files
  app.post(
    "/api/trips/:tripId/files",
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const [file] = await db
          .insert(files)
          .values({
            filename: req.file.originalname,
            path: req.file.path,
            type: path.extname(req.file.originalname),
            tripId: parseInt(req.params.tripId)
          })
          .returning();

        res.json(file);
      } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    }
  );

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}