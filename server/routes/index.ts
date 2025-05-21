import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import tripPdfRoutes from './trip-pdf';

export function registerRoutes(app: Express) {
  // Register all routes here
  app.use(shareNotificationRoutes);
  app.use(tripPdfRoutes);
}