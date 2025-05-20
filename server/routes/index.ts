import { Express } from 'express';
import shareNotificationRoutes from './share-notification';

export function registerRoutes(app: Express) {
  // Register all routes here
  app.use(shareNotificationRoutes);
}