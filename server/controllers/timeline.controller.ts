import { db } from "@db";
import { timelineEntries } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

export async function getTimelineEntries(req: Request, res: Response) {
  const entries = await db
    .select()
    .from(timelineEntries)
    .where(eq(timelineEntries.tripId, parseInt(req.params.tripId)))
    .orderBy(timelineEntries.startTime);

  res.json(entries);
}

export async function createTimelineEntry(req: Request, res: Response) {
  const [entry] = await db
    .insert(timelineEntries)
    .values({
      ...req.body,
      tripId: parseInt(req.params.tripId),
    })
    .returning();

  res.json(entry);
}

export async function updateTimelineEntry(req: Request, res: Response) {
  const [entry] = await db
    .update(timelineEntries)
    .set({
      ...req.body,
      updatedAt: new Date(),
    })
    .where(eq(timelineEntries.id, parseInt(req.params.entryId)))
    .returning();

  res.json(entry);
}
