import Stripe from "stripe";

// A bare `new Stripe(...)` with no key would throw at import time (breaking
// every route that imports this file, even ones that don't use Stripe) if
// STRIPE_SECRET_KEY isn't set yet — fall back to an obviously-fake key so
// the module loads; real calls just fail with a clear Stripe auth error
// until the real key is configured. Same pattern as the Supabase client
// placeholders (see lib/supabase/client.ts).
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

export const stripe = new Stripe(STRIPE_SECRET_KEY);
