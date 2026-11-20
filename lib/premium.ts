// Free users get FREE_SCANS food photo analyses in total; Premium is unlimited.
export const FREE_SCANS = 5;
export const PREMIUM_PRICE_LABEL = "$4.99/month";

/** Stripe subscription statuses that count as Premium. */
export const isPremiumStatus = (status: string | null | undefined) => status === "active" || status === "trialing";
