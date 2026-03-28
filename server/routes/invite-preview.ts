import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Common link preview bot user-agent patterns
const BOT_UA_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'iMessageBot',
  'Applebot',
  'Google-InspectionTool',
  'Googlebot',
  'bingbot',
  'PetalBot',
  // macOS Messages and Apple link-preview agents
  'MessageMedia',
  'com.apple.SafariViewService',
  'dataminr',
  'rogerbot',
  'tumblr',
  'vkShare',
  'W3C_Validator',
  'bot',
  'crawler',
  'spider',
];

export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_UA_PATTERNS.some((pattern) => ua.includes(pattern.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

router.get('/invite/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const userAgent = req.get('user-agent');

  // Only serve OG HTML to bots; real users get the SPA
  if (!isBot(userAgent)) {
    // Fall through to SPA handler
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(503).send('Application is starting up.');
  }

  // For bots, fetch invite preview from Supabase and return OG-enriched HTML
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).send('Server configuration error');
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.rpc('get_invite_link_preview', {
      p_invite_code: code,
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      // Return generic OG tags for invalid/expired links
      return res.send(buildOgHtml({
        title: 'WanderLuxe - Trip Invite',
        description: 'You\'ve been invited to join a trip on WanderLuxe!',
        imageUrl: `${req.protocol}://${req.get('host')}/logos/Sand%20Simple.png`,
        url: `${req.protocol}://${req.get('host')}/invite/${code}`,
      }));
    }

    const preview = Array.isArray(data) ? data[0] : data;
    const inviterName = preview.inviter_name || 'Someone';
    const destination = preview.destination || 'a trip';
    const imageUrl = preview.cover_image_url || `${req.protocol}://${req.get('host')}/logos/Sand%20Simple.png`;

    return res.send(buildOgHtml({
      title: `${inviterName} invited you to "${destination}"`,
      description: `Join this trip on WanderLuxe! Click to view details and start planning together.`,
      imageUrl,
      url: `${req.protocol}://${req.get('host')}/invite/${code}`,
    }));
  } catch (err) {
    console.error('Invite preview OG error:', err);
    return res.send(buildOgHtml({
      title: 'WanderLuxe - Trip Invite',
      description: 'You\'ve been invited to join a trip on WanderLuxe!',
      imageUrl: `${req.protocol}://${req.get('host')}/logos/Sand%20Simple.png`,
      url: `${req.protocol}://${req.get('host')}/invite/${code}`,
    }));
  }
});

function buildOgHtml({ title, description, imageUrl, url }: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - WanderLuxe</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:site_name" content="WanderLuxe" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
</head>
<body>
  <p>${escapeHtml(title)}</p>
  <p>${escapeHtml(description)}</p>
</body>
</html>`;
}

export default router;
