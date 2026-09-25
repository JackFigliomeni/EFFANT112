import { PostHog } from "posthog-node";

export function createPostHogClient(): PostHog | null {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  // Every call site does `const posthog = createPostHogClient(); if (posthog)
  // {...}` inside the same try block as the actual request logic (Stripe,
  // account deletion, ...) — analytics being unconfigured must never turn
  // into "Couldn't start checkout" or "Couldn't delete your account" for
  // something PostHog-shaped. Warn once per request instead of throwing.
  if (!projectToken) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "PostHog: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing or un-configured — events are being silently skipped.",
      );
    }
    return null;
  }

  if (!host) {
    if (process.env.NODE_ENV === "development") {
      console.warn("PostHog: NEXT_PUBLIC_POSTHOG_HOST is missing or un-configured — events are being silently skipped.");
    }
    return null;
  }

  return new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}
