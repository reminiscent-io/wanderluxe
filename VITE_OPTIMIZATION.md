# Vite File Watcher Optimization

## Required Manual Update

To reduce file watchers from ~22,000 to <2,000, add this configuration to your `vite.config.ts` file inside the `server` object:

```typescript
server: {
  // ... your existing server config ...
  watch: {
    ignored: [
      "**/.cache/**",
      "**/node_modules/**",
    ],
  },
},
```

## What This Does

- Excludes cache directories from file watching
- Excludes node_modules from file watching
- Reduces memory usage and improves performance
- Prevents hitting file watcher quotas

## Files Already Updated

- ✓ `.env.local` - Added Vite optimization variables
- ✓ `.gitignore` - Added cache directories to ignore list

## After Manual Update

Restart the development server to see the reduced watcher count.