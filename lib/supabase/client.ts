import { createBrowserClient } from "@supabase/ssr";

// Browser client. Every table has row-level security, so users can only touch their own rows.
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
