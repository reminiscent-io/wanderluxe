#!/bin/bash
cd "$(dirname "$0")"
export HOST=0.0.0.0
export PORT=8080
exec bun run dev
