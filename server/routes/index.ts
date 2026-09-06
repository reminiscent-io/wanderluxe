import { Express } from 'express';
import shareNotificationRoutes from './share-notification';
import aiChatRoutes from './ai-chat';
import stripeRoutes from './stripe';
import invitePreviewRoutes from './invite-preview';
import adminInsightsRoutes from './admin-insights';
import accountRoutes from './account';
import calendarRoutes from './calendar';
import mcpRoutes from './mcp';
import printDesignRoutes from './print-design';

export function registerRoutes(app: Express) {
  // Invite preview must be registered before the SPA catch-all
  // so link preview bots get OG meta tags
  app.use(invitePreviewRoutes);
  app.use(shareNotificationRoutes);
  app.use(aiChatRoutes);
  app.use(stripeRoutes);
  app.use(adminInsightsRoutes);
  app.use(accountRoutes);
  app.use(calendarRoutes);
  app.use(printDesignRoutes);
  // MCP endpoint + OAuth discovery metadata (registered before the SPA
  // catch-all so GET /.well-known/* isn't swallowed by the React app)
  app.use(mcpRoutes);
}
