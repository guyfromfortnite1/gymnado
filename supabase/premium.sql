-- Run once in Supabase → SQL Editor → New query → Run, if you set up the database before Premium existed.

-- Premium: one row per user, written only by the server (Stripe webhook) with the secret key.
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null,
  updated_at timestamptz not null default now()
);

-- One row per successful food photo analysis; free users get a limited number in total.
create table public.food_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.food_scans (user_id);

alter table public.subscriptions enable row level security;
alter table public.food_scans enable row level security;
-- Users can read their subscription but never change it; they can add scans but never delete them.
create policy "read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create policy "read own scans" on public.food_scans for select using (auth.uid() = user_id);
create policy "add own scans" on public.food_scans for insert with check (auth.uid() = user_id);
