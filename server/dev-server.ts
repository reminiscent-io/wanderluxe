import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { registerRoutes } from './routes';

async function startDevServer() {
  const app = express();

  app.use(cors());

  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json());

  registerRoutes(app);

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        port: 8081,
      },
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const httpServer = createServer(app);

  const PORT = process.env.PORT || 5001;

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Combined dev server running on port ${PORT}`);
    console.log(`API routes available at /api/*`);
    console.log(`Frontend served with Vite HMR`);
  });
}

startDevServer().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
