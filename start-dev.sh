#!/bin/bash

# Start the backend Express server in the background
npx tsx server/index.ts &

# Start the frontend Vite server
npx vite
