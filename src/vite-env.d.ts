/// <reference types="vite/client" />

declare module '*.ttf?url' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_PARSE_TRAVEL_DOC_URL?: string;
  readonly VITE_PLACE_PHOTO_CACHE_TTL_MS?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_POSTHOG_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected at build time by vite.config.ts `define`.
declare const __APP_VERSION__: string;
declare const __APP_GIT_SHA__: string;
declare const __APP_BUILD_TIME__: string;
