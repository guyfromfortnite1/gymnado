import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this when a subscription starts, changes, or ends. It's the only thing
// that writes to public.subscriptions, so users can't grant themselves Premium.
export async function POST(request: Request) {
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    // Re-fetch so events arriving out of order can't save a stale status.
    const sub = await stripe.subscriptions.retrieve(event.data.object.id);
    const userId = sub.metadata.user_id;
    if (userId) {
      const { error } = await createAdminClient().from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        updated_at: new Date().toISOString(),
      });
      if (error) return new Response(error.message, { status: 500 }); // Stripe retries on failure
    }
  }

  return Response.json({ received: true });
}
