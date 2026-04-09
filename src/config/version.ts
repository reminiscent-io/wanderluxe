/**
 * App version identity, baked in at build time by vite.config.ts.
 *
 * - `version` is the semver from package.json (bumped manually for releases).
 * - `sha` is the short git commit hash this bundle was built from.
 * - `buildTime` is an ISO timestamp of when the bundle was built.
 *
 * These constants are compile-time replaced by Vite's `define`, so they're
 * zero-cost at runtime and tree-shake friendly.
 */
export const APP_VERSION = {
  version: __APP_VERSION__,
  sha: __APP_GIT_SHA__,
  buildTime: __APP_BUILD_TIME__,
} as const;

/** Short label for UI display, e.g. "v1.4.0 · a1b2c3d". */
export const APP_VERSION_LABEL = `v${APP_VERSION.version} · ${APP_VERSION.sha}`;

/** Full label with build time, for tooltips. */
export const APP_VERSION_FULL = `v${APP_VERSION.version} · ${APP_VERSION.sha} · ${APP_VERSION.buildTime}`;
