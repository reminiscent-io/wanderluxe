#!/bin/bash
# Start both the backend server and Vite dev server
NODE_ENV=development bun run server/index.ts &
SERVER_PID=$!
vite
kill $SERVER_PID 2>/dev/null
