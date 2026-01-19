import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import tripPdfRoutes from './trip-pdf';
import aiChatRoutes from './ai-chat';
import stripeRoutes from './stripe';

export function registerRoutes(app: Express) {
  app.use(shareNotificationRoutes);
  app.use(tripPdfRoutes);
  app.use(aiChatRoutes);
  app.use(stripeRoutes);
}