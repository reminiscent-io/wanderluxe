import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { APP_VERSION } from "@/config/version";

interface RemoteVersion {
  version: string;
  sha: string;
  buildTime: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Polls /version.json and shows a toast when a newer build is deployed.
 *
 * - Only runs in production builds (dev has HMR).
 * - Compares the git SHA bundled into the app against the one on the server.
 * - Polls on an interval and whenever the tab becomes visible again.
 * - Toast is shown once per detected version, with a "Refresh" action.
 */
export function useVersionCheck() {
  const notifiedShaRef = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    let cancelled = false;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const remote: RemoteVersion = await res.json();
        if (cancelled) return;

        // Different SHA = new build available.
        if (
          remote.sha &&
          remote.sha !== APP_VERSION.sha &&
          remote.sha !== notifiedShaRef.current
        ) {
          notifiedShaRef.current = remote.sha;
          toast.info("A new version of WanderLuxe is available", {
            description: `v${remote.version} · ${remote.sha}`,
            duration: Infinity,
            action: {
              label: "Refresh",
              onClick: () => {
                // Ask the active SW (if any) to update, then hard reload.
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker
                    .getRegistration()
                    .then((reg) => reg?.update())
                    .finally(() => window.location.reload());
                } else {
                  window.location.reload();
                }
              },
            },
          });
        }
      } catch {
        // Network error — silently ignore, we'll try again next tick.
      }
    };

    // Initial check shortly after mount (give the app a beat to settle).
    const initialTimer = window.setTimeout(checkVersion, 10_000);
    const interval = window.setInterval(checkVersion, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
