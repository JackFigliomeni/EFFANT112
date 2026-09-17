import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const runtime = "nodejs";

/**
 * Stripe calls this directly — no logged-in user, no cookies, just a
 * signed POST body. Signature verification (not a session) is what proves
 * this request is genuinely from Stripe, which is why it needs the raw
 * body: request.text() here, never request.json() — parsing/re-serializing
 * would change the bytes and break the signature check.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId) break;
        await supabase
          .from("profiles")
          .update({
            plan: "pro",
            plan_status: "active",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id:
              typeof session.subscription === "string" ? session.subscription : null,
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const active = subscription.status === "active" || subscription.status === "trialing";
        await supabase
          .from("profiles")
          .update({
            plan: active ? "pro" : "free",
            plan_status: subscription.status,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        // Other event types aren't relevant to plan status — ignore.
        break;
    }
  } catch (err) {
    console.error("stripe webhook: failed to apply event", event.type, err);
    // Still return 200 below — Stripe retries on non-2xx for up to 3 days,
    // and a persistent failure here (e.g. a bad user id) would just retry
    // forever without ever succeeding. Logged above for manual follow-up.
  }

  return NextResponse.json({ received: true });
}
