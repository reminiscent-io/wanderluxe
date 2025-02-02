import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chatRouter from './routes/chat';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix DNS resolution order for Node.js v17+
dns.setDefaultResultOrder('verbatim');

const app = express();

// Trust proxy - required for Replit's environment
app.set('trust proxy', true);

// Enable CORS with specific origin and credentials
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Authorization']
}));

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, "express");
    }
  });
  next();
});

// API routes
app.use('/api/chat', chatRouter);

let server: ReturnType<typeof registerRoutes>;

const startServer = async () => {
  try {
    server = registerRoutes(app);

    // Add error handling for the server
    server.on('error', (err: Error & { code?: string }) => {
      console.error('Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.log('Address in use, retrying in 1 second...');
        setTimeout(() => {
          server.close();
          server.listen(PORT, '0.0.0.0');
        }, 1000);
      }
    });

    if (app.get("env") === "development") {
      await setupVite(app);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 8080;
    const VITE_PORT = process.env.VITE_PORT || 5173;

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      log(`Express server running on port ${PORT}`, "express");
      log(`Vite dev server running on port ${VITE_PORT}`, "vite");
    });

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();