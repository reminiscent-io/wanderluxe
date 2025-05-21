import express, { Request, Response } from 'express';

const router = express.Router();

interface ShareNotificationBody {
  toEmail: string;
  fromEmail: string;
  tripDestination: string;
}

// Health check for notification endpoint
router.get('/api/send-share-notification/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Share notification endpoint - now redirects to Supabase Edge Function
router.post('/api/send-share-notification', async (req: Request<{}, any, ShareNotificationBody>, res: Response) => {
  // This route is maintained for backward compatibility
  // Email notifications are now handled by Supabase Edge Functions
  res.status(200).json({ 
    success: true, 
    message: 'Email notifications are now handled by Supabase Edge Functions' 
  });
});

export default router;