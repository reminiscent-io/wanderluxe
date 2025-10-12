/// <reference types="vite/client" />

declare module "*.mjs?url" {
  const url: string;
  export default url;
}

interface ImportMetaEnv {
  readonly VITE_PARSE_TRAVEL_DOC_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
