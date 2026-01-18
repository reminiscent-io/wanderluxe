import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import tripPdfRoutes from './trip-pdf';
import aiChatRoutes from './ai-chat';

export function registerRoutes(app: Express) {
  // Register all routes here
  app.use(shareNotificationRoutes);
  app.use(tripPdfRoutes);
  app.use(aiChatRoutes);
}