import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import tripPdfRoutes from './trip-pdf';
import exportItineraryPdfRoutes from './export-itinerary-pdf';

export function registerRoutes(app: Express) {
  // Register all routes here
  app.use(shareNotificationRoutes);
  app.use(tripPdfRoutes);
  app.use(exportItineraryPdfRoutes);
}