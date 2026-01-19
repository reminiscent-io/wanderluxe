#!/bin/bash
# Start both the Express backend server and Vite frontend dev server concurrently
# Backend runs on port 5000, Vite runs on port 8080
# Vite proxies /api requests to the backend on port 5000

npx concurrently --kill-others "NODE_ENV=development bun run server/index.ts" "vite"
