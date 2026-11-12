import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';

// Long-running server for local dev (`npm run dev:server`). Vercel doesn't run
// this file: it imports ./app as a function (see scripts/build-vercel-output.ts).
// PORT defaults to 5001 (5000 is taken by macOS AirPlay).
const PORT = process.env.PORT || 5001;
const httpServer = createServer(app);

// Start server on 0.0.0.0 to accept external connections
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files: ${fs.existsSync(path.resolve(process.cwd(), 'dist')) ? 'Available' : 'Not found'}`);
});

export default httpServer;
