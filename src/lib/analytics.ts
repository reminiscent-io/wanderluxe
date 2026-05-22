import posthog from 'posthog-js';

type EventProps = Record<string, string | number | boolean | null | undefined>;

export const track = (event: string, props?: EventProps): void => {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props ?? {});
  }
  posthog.capture(event, props);
};

export const identifyUser = (
  userId: string,
  props?: EventProps,
): void => {
  posthog.identify(userId, props);
};

export const resetAnalytics = (): void => {
  posthog.reset();
};
