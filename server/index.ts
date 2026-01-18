import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { registerRoutes } from './routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Register API routes
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

  // Handle SPA routing - serve index.html for all non-API routes
  // Use regex pattern compatible with Express 5.x
  app.get(/^(?!\/api).*$/, (req, res) => {
    // Check if index.html exists before serving
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

// Create HTTP server - Use port 5000 for Replit deployments
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Start server on 0.0.0.0 to accept external connections
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files: ${fs.existsSync(distPath) ? 'Available' : 'Not found'}`);
});

export default httpServer;