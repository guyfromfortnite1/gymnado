-- Run in the Supabase dashboard → SQL Editor → New query → Run. Safe to run again: existing tables are kept.
-- Every table has row-level security: a signed-in user can only read and write their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  sex text not null check (sex in ('male', 'female')),
  age int not null check (age between 13 and 100),
  height_cm numeric not null check (height_cm between 100 and 250),
  weight_kg numeric not null check (weight_kg between 30 and 300),
  activity_level text not null,
  experience text not null,
  physique_goal text not null,
  target_muscles text[] not null default '{}',
  sports text[] not null default '{}',
  missing_equipment text[] not null default '{}',
  training_days int[] not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  split_name text not null,
  ai_explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid not null references public.plans on delete cascade,
  day_index int not null,
  name text not null,
  exercises jsonb not null -- [{exercise_id, sets, reps, rest_sec}]
);

create table if not exists public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_day_id uuid not null references public.plan_days on delete cascade,
  date date not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped'))
);
create index if not exists scheduled_workouts_user_id_date_idx on public.scheduled_workouts (user_id, date);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  items jsonb not null, -- [{name, portion, calories, protein_g, carbs_g, fat_g}]
  calories int not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_id_date_idx on public.food_logs (user_id, date);

-- Premium: one row per user, written only by the server (Stripe webhook) with the secret key.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null,
  updated_at timestamptz not null default now()
);

-- One row per successful food photo analysis; free users get a limited number in total.
create table if not exists public.food_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists food_scans_user_id_idx on public.food_scans (user_id);

-- Progress tracking (Premium): body weight per day and every logged set.
create table if not exists public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg between 30 and 300),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  scheduled_workout_id uuid references public.scheduled_workouts on delete set null,
  exercise_id text not null,
  date date not null,
  set_number int not null check (set_number between 1 and 20),
  weight_kg numeric check (weight_kg between 0 and 500),
  reps int check (reps between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists set_logs_user_id_exercise_id_date_idx on public.set_logs (user_id, exercise_id, date);

-- One row per AI request, for per-user daily rate limits. Users can add rows but never delete them.
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_id_kind_created_at_idx on public.ai_usage (user_id, kind, created_at);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.food_logs enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own plan days" on public.plan_days;
create policy "own plan days" on public.plan_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own workouts" on public.scheduled_workouts;
create policy "own workouts" on public.scheduled_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own food" on public.food_logs;
create policy "own food" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.subscriptions enable row level security;
alter table public.food_scans enable row level security;
-- Users can read their subscription but never change it; they can add scans but never delete them.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "read own scans" on public.food_scans;
create policy "read own scans" on public.food_scans for select using (auth.uid() = user_id);
drop policy if exists "add own scans" on public.food_scans;
create policy "add own scans" on public.food_scans for insert with check (auth.uid() = user_id);

alter table public.body_weights enable row level security;
alter table public.set_logs enable row level security;
alter table public.ai_usage enable row level security;
drop policy if exists "own weights" on public.body_weights;
create policy "own weights" on public.body_weights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own sets" on public.set_logs;
create policy "own sets" on public.set_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "read own ai usage" on public.ai_usage;
create policy "read own ai usage" on public.ai_usage for select using (auth.uid() = user_id);
drop policy if exists "add own ai usage" on public.ai_usage;
create policy "add own ai usage" on public.ai_usage for insert with check (auth.uid() = user_id);
