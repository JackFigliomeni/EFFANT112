import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { createPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Stripe isn't configured yet." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${origin}/pricing?upgraded=1`,
      cancel_url: `${origin}/pricing`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe didn't return a checkout URL." }, { status: 502 });
    }
    const posthog = createPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: user.id,
        event: "checkout_started",
        properties: { checkout_mode: session.mode },
      });
      await posthog.shutdown();
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe checkout: failed to create session", err);
    const posthog = createPostHogClient();
    if (posthog) {
      posthog.captureException(err, user.id);
      await posthog.shutdown();
    }
    return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
  }
}
