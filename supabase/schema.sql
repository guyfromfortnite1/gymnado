-- Run once in the Supabase dashboard → SQL Editor → New query → Run.
-- Every table has row-level security: a signed-in user can only read and write their own rows.

create table public.profiles (
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
  sport text,
  missing_equipment text[] not null default '{}',
  training_days int[] not null,
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  split_name text not null,
  ai_explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid not null references public.plans on delete cascade,
  day_index int not null,
  name text not null,
  exercises jsonb not null -- [{exercise_id, sets, reps, rest_sec}]
);

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_day_id uuid not null references public.plan_days on delete cascade,
  date date not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped'))
);
create index on public.scheduled_workouts (user_id, date);

create table public.food_logs (
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
create index on public.food_logs (user_id, date);

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.scheduled_workouts enable row level security;
alter table public.food_logs enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own plans" on public.plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own plan days" on public.plan_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workouts" on public.scheduled_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own food" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
