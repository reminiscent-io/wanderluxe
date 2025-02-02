import { db } from "@db";
import { trips } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { Request, Response } from "express";

export async function getTrips(req: Request, res: Response) {
  try {
    const userTrips = await db
      .select()
      .from(trips)
      .orderBy(desc(trips.createdAt));

    res.json(userTrips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}

export async function createTrip(req: Request, res: Response) {
  try {
    const [trip] = await db
      .insert(trips)
      .values({
        ...req.body
      })
      .returning();

    res.json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}