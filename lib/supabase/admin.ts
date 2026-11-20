import { createClient } from "@supabase/supabase-js";

// Server-only client with the secret key. It bypasses row-level security, so only use it
// for trusted writes (the Stripe webhook) and never import it into client components.
export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
