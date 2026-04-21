import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from './routes';

const app = express();

// Trust first proxy (Replit, Cloudflare, etc.) for accurate rate limiting
app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:5001'];

const allowedOriginPatterns = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /wanderluxe\.io$/];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowedOriginPatterns.some(pattern => pattern.test(origin))) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://us-assets.i.posthog.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://plus.unsplash.com", "https://*.supabase.co", "https://maps.googleapis.com", "https://lh3.googleusercontent.com", "https://places.googleapis.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app"],
      connectSrc: ["'self'", "blob:", "https://*.supabase.co", "wss://*.supabase.co", "https://api.stripe.com", "https://maps.googleapis.com", "https://places.googleapis.com", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.googletagmanager.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://images.unsplash.com", "https://plus.unsplash.com", "https://lh3.googleusercontent.com", "https://ipapi.co", "https://us.i.posthog.com", "https://us-assets.i.posthog.com", "https://*.replit.dev", "wss://*.replit.dev", "https://*.repl.co", "wss://*.repl.co", "https://*.replit.app", "wss://*.replit.app"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app"],
    },
  },
  crossOriginEmbedderPolicy: { policy: "credentialless" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Rate limiting to prevent DoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

// Apply rate limiting to API routes only (not static files)
app.use('/api', generalLimiter);

registerRoutes(app);

// Simple health check route
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Serve static files and handle SPA routing
const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

// Check if dist folder exists and serve static files
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Handle SPA routing - prefer prerendered HTML for known public routes,
  // fall back to index.html for everything else (client-side routing).
  // Use regex pattern compatible with Express 5.x
  app.get(/^(?!\/api).*$/, (req, res) => {
    const urlPath = (req.path || '/').replace(/\/$/, '') || '/';
    const prerenderedPath =
      urlPath === '/'
        ? indexPath
        : path.join(distPath, urlPath.replace(/^\//, ''), 'index.html');

    if (urlPath !== '/' && fs.existsSync(prerenderedPath)) {
      return res.sendFile(prerenderedPath);
    }

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Application is starting up. Please try again in a moment.');
    }
  });
} else if (process.env.NODE_ENV === 'production') {
  // In production without dist folder, return helpful message
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.status(503).send('Application build not found. Please run "npm run build" first.');
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Cloud Run sets PORT env var; fall back to 5001 (5000 used by macOS AirPlay)
const PORT = process.env.PORT || 5001;
const httpServer = createServer(app);

// Start server on 0.0.0.0 to accept external connections
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files: ${fs.existsSync(distPath) ? 'Available' : 'Not found'}`);
});

export default httpServer;