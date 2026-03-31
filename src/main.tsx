// Validate environment variables first (fails fast if missing)
import './config/env';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import App from './App.tsx'
import './index.css'

// Initialize PostHog analytics
const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// iOS Viewport Fix: Set CSS custom property for safe viewport height
// This provides a fallback for browsers that don't support dvh units
function setViewportHeight() {
  // Calculate 1% of viewport height
  const vh = window.innerHeight * 0.01;
  // Set the --app-height custom property
  document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

// Set initial viewport height
setViewportHeight();

// Update on resize and orientation change
// Use debouncing to avoid excessive updates
let resizeTimeout: number;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(setViewportHeight, 100);
});

// iOS specifically needs orientation change handling
window.addEventListener('orientationchange', () => {
  // Delay to allow iOS to finish the rotation
  setTimeout(setViewportHeight, 200);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </StrictMode>
);

// DEV: aggressively clean up any lingering SWs
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// PROD: only register SW in production builds
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates periodically (every 60 minutes)
        setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch(() => {
        // Service worker registration failed, app will still work online
      });
  });

  // Reload page when a new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
