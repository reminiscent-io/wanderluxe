import { db } from "@db";
import { trips } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { Request, Response } from "express";

export async function getTrips(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  const userTrips = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, req.user.id))
    .orderBy(desc(trips.createdAt));

  res.json(userTrips);
}

export async function createTrip(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  const [trip] = await db
    .insert(trips)
    .values({
      ...req.body,
      userId: req.user.id,
    })
    .returning();

  res.json(trip);
}
