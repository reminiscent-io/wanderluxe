#!/bin/bash
# Combined development server - Express backend + Vite frontend in single process
# All on port 5000: API routes at /api/*, Frontend with HMR
NODE_ENV=development bun run server/dev-server.ts
