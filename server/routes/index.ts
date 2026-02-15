import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import aiChatRoutes from './ai-chat';
import stripeRoutes from './stripe';
import invitePreviewRoutes from './invite-preview';

export function registerRoutes(app: Express) {
  // Invite preview must be registered before the SPA catch-all
  // so link preview bots get OG meta tags
  app.use(invitePreviewRoutes);
  app.use(shareNotificationRoutes);
  app.use(aiChatRoutes);
  app.use(stripeRoutes);
}
