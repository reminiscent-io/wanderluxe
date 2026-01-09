/// <reference types="vite/client" />

declare module "*.mjs?url" {
  const url: string;
  export default url;
}

interface ImportMetaEnv {
  // Required variables
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;

  // Optional variables
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_PARSE_TRAVEL_DOC_URL?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_PLACE_PHOTO_CACHE_TTL_MS?: string;

  // Vite environment variables
  readonly MODE: 'development' | 'production' | 'test';
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
