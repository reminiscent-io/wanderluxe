import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import shareNotificationRoutes from './routes/share-notification.js';
import tripPdfRoutes from './routes/trip-pdf.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use(shareNotificationRoutes);
app.use(tripPdfRoutes);

// Simple health check route
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Create HTTP server
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default httpServer;