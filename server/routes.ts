import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import chatRouter from "./routes/chat";
import { db } from "@db";
import { trips, messages, files, timelineEntries, collaborators, type SelectUser } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { requireAuth, requireTripAccess } from "./middleware/auth.middleware";
import {
  getTimelineEntries,
  createTimelineEntry,
  updateTimelineEntry,
} from "./controllers/timeline.controller";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Trips
  app.get("/api/trips", requireAuth, async (req, res) => {
    const userTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, req.user!.id))
      .orderBy(desc(trips.createdAt));

    res.json(userTrips);
  });

  app.post("/api/trips", requireAuth, async (req, res) => {
    const [trip] = await db
      .insert(trips)
      .values({
        ...req.body,
        userId: req.user!.id,
      })
      .returning();

    // Create initial collaborator record for trip owner
    await db.insert(collaborators).values({
      tripId: trip.id,
      userId: req.user!.id,
      role: "owner",
      inviteStatus: "accepted",
    });

    res.json(trip);
  });

  // Timeline Entries
  app.get(
    "/api/trips/:tripId/timeline",
    requireAuth,
    requireTripAccess("viewer"),
    getTimelineEntries
  );

  app.post(
    "/api/trips/:tripId/timeline",
    requireAuth,
    requireTripAccess("editor"),
    createTimelineEntry
  );

  app.put(
    "/api/trips/:tripId/timeline/:entryId",
    requireAuth,
    requireTripAccess("editor"),
    updateTimelineEntry
  );

  // Collaborators
  app.post("/api/trips/:tripId/collaborators", requireAuth, requireTripAccess("owner"), async (req, res) => {
    const [collaborator] = await db
      .insert(collaborators)
      .values({
        tripId: parseInt(req.params.tripId),
        userId: req.body.userId,
        role: req.body.role,
      })
      .returning();

    res.json(collaborator);
  });

  app.get("/api/trips/:tripId/collaborators", requireAuth, requireTripAccess("viewer"), async (req, res) => {
    const tripCollaborators = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.tripId, parseInt(req.params.tripId)));

    res.json(tripCollaborators);
  });

  // Messages
  app.use('/api/chat', chatRouter);

  app.get("/api/trips/:tripId/messages", requireAuth, requireTripAccess("viewer"), async (req, res) => {
    const tripMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.tripId, parseInt(req.params.tripId)))
      .orderBy(desc(messages.createdAt));

    res.json(tripMessages);
  });

  // Files
  app.post(
    "/api/trips/:tripId/files",
    requireAuth,
    requireTripAccess("editor"),
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const [file] = await db
        .insert(files)
        .values({
          tripId: parseInt(req.params.tripId),
          userId: req.user!.id,
          filename: req.file.originalname,
          path: req.file.path,
          type: path.extname(req.file.originalname),
        })
        .returning();

      res.json(file);
    }
  );

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  return httpServer;
}