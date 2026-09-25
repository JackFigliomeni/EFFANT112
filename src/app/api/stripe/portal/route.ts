import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { createPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";

/**
 * Stripe's hosted Customer Portal — lets a subscriber cancel, update their
 * card, or view invoices themselves instead of emailing support. Requires
 * a billing portal configuration to exist on the Stripe account (created
 * once via the API, not per-request) with subscription_cancel enabled.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found — you're not currently a Pro subscriber." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    const posthog = createPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: user.id, event: "billing_portal_opened" });
      await posthog.shutdown();
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe portal: failed to create session", err);
    const posthog = createPostHogClient();
    if (posthog) {
      posthog.captureException(err, user.id);
      await posthog.shutdown();
    }
    return NextResponse.json({ error: "Couldn't open the billing portal." }, { status: 502 });
  }
}
