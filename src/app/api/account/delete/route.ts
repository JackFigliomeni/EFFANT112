import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Self-service account deletion (Privacy Policy promises this; previously
 * "email us" only). Cancels any live Stripe subscription first — Stripe has
 * no idea our database row disappeared, and would otherwise keep billing a
 * card for an account that no longer exists. Everything else (profile,
 * owned tools, their records, admin status) cascades automatically via the
 * `on delete cascade` foreign keys already on those tables (see migrations
 * 0001/0002/0010) once the auth user itself is deleted — nothing left to
 * clean up by hand.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      // Already canceled, or Stripe is briefly unreachable — either way,
      // don't let a Stripe hiccup block someone from deleting their own
      // account; log it for manual follow-up instead.
      console.error("account delete: failed to cancel subscription", user.id, err);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: `Couldn't delete your account: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
