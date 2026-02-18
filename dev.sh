#!/bin/bash
./node_modules/.bin/concurrently "vite" "NODE_ENV=development bun run server/index.ts"
