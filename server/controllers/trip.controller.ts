import { db } from "@db";
import { trips } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { Request, Response } from "express";

export async function getTrips(req: Request, res: Response) {
  try {
    const userTrips = await db
      .select({
        id: trips.id,
        title: trips.title,
        destination: trips.destination,
        budget: trips.budget,
        status: trips.status,
        startDate: trips.startDate,
        endDate: trips.endDate,
        createdAt: trips.createdAt,
      })
      .from(trips)
      .orderBy(desc(trips.createdAt));

    if (!userTrips) {
      return res.status(404).json({ message: 'No trips found' });
    }

    res.json(userTrips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: 'Failed to fetch trips', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export async function createTrip(req: Request, res: Response) {
  try {
    const { title, destination, budget, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [trip] = await db
      .insert(trips)
      .values({
        title,
        destination: destination || null,
        budget: budget || null,
        status: status || 'planning'
      })
      .returning();

    res.json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}