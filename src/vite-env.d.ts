/// <reference types="vite/client" />

declare module '*.ttf?url' {
  const src: string;
  export default src;
}

// Injected at build time by vite.config.ts `define`.
declare const __APP_VERSION__: string;
declare const __APP_GIT_SHA__: string;
declare const __APP_BUILD_TIME__: string;
