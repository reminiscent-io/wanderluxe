import type { Plugin, ViteDevServer } from 'vite';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';

export function expressPlugin(): Plugin {
  return {
    name: 'express-backend',
    configureServer(server: ViteDevServer) {
      const app = express();

      app.use(cors());
      
      app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
      
      app.use(express.json());

      registerRoutes(app);

      app.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      server.middlewares.use(app);

      console.log('Express backend integrated with Vite dev server');
    },
  };
}
