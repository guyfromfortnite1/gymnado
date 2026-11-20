import Stripe from "stripe";

// Server-only. Created lazily so builds work without STRIPE_SECRET_KEY set.
let client: Stripe | null = null;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payments aren't set up yet (STRIPE_SECRET_KEY is missing).");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

const PRICE_LOOKUP_KEY = "gymnado_premium_monthly";

/** The $4.99/month Premium price. Created in Stripe the first time it's needed. */
export async function getPremiumPriceId() {
  const stripe = getStripe();
  const { data } = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEY], active: true, limit: 1 });
  if (data[0]) return data[0].id;
  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: 499,
    recurring: { interval: "month" },
    lookup_key: PRICE_LOOKUP_KEY,
    product_data: { name: "GymNado Premium" },
  });
  return price.id;
}
