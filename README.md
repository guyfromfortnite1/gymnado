# GymNado

GymNado is a fitness web app. You tell it your goal, the muscles you want to focus on, any sport you play, and which days you can train. It then:

- builds a training split for you (full body, upper/lower, push/pull/legs, and so on)
- adds sport-specific exercises
- schedules your workouts on a weekly calendar
- estimates calories and macros from a photo of your meal

It uses Next.js for the website, Supabase for accounts and the database, and Claude (Anthropic's AI) to explain plans, swap exercises and read food photos.

---

## Before you start

You need:

- **Node.js 20.9 or newer.** Check by running `node -v` in a terminal. If you don't have it, download the LTS version from https://nodejs.org.
- **A code editor.** VS Code is a good choice.
- **A free Supabase account:** https://supabase.com
- **An Anthropic account with an API key:** https://console.anthropic.com. API usage is paid, so add a small amount of credit (a few dollars is plenty for testing). Each plan or food photo costs a fraction of a cent to a few cents.

This project doesn't include any API keys. You'll create your own in the steps below.

---

## Setup (about 15 minutes)

### 1. Install the code

Unzip the folder, open a terminal inside it, and run:

```bash
npm install
```

This downloads everything the app needs into a `node_modules` folder. It takes a minute or two.

### 2. Set up Supabase (accounts and database)

1. Sign in at https://supabase.com and click **New project**. Pick any name and password, then wait for it to finish setting up.
2. In the left sidebar, open **SQL Editor** and click **New query**.
3. Open `supabase/schema.sql` from this project, copy everything in it, paste it into the editor and click **Run**. This creates the tables the app stores data in. You should see "Success. No rows returned."
4. Go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". GymNado logs people in straight after sign-up and doesn't send verification emails.
5. Go to **Project Settings → API Keys**. Keep this page open, because you'll copy two values from it in step 4: the **Project URL** and the **publishable key** (older projects call it the "anon" key).

### 3. Get an Anthropic API key

1. Sign in at https://console.anthropic.com.
2. Add credit under **Billing**.
3. Go to **API Keys**, create a key and copy it. It starts with `sk-ant-`. You can only see it once, so paste it somewhere safe.

### 4. Add your keys to the project

Copy the example settings file:

```bash
cp .env.local.example .env.local
```

On Windows, use `copy .env.local.example .env.local` instead.

Open `.env.local` and replace the three placeholder values with yours:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

> **Keep `.env.local` private.** Never share it, post it or upload it to GitHub. The `.gitignore` file already stops git from including it. If you ever leak your Anthropic key, delete it in the console and make a new one.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 in your browser and click **Create an account**. To stop the app, press `Ctrl + C` in the terminal.

---

## Using GymNado

1. **Sign up**, then fill in the onboarding form: body stats, goal, focus muscles, sport, training days and any equipment you *don't* have. The app assumes a full gym unless you say otherwise.
2. **Plan:** see your split and Claude's explanation. Click **Swap** on any exercise and give a reason (for example, "hurts my shoulder") to get an alternative.
3. **Schedule:** your workouts are placed on the days you chose for the next 4 weeks. Mark them done or skipped, or move them to another day.
4. **Food:** take or upload a photo of a meal, check and edit the estimate, then save it. Progress bars show how you're doing against your daily targets.
5. **Today:** the home page shows today's workout and today's macros.
6. **Profile:** change your answers at any time and regenerate your plan.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the app at http://localhost:3000 and reloads it as you edit code |
| `npm test` | Runs the automated tests for the workout and macro logic |
| `npm run lint` | Checks the code for common mistakes |
| `npm run build` | Builds the production version, which also catches type errors |

---

## How the code is organized

```
app/                Pages. Each folder is a page: app/food/page.tsx is /food
  actions.ts        Server code the pages call (generate plan, swap exercise, analyze food)
components/         Reusable pieces of the UI (nav bar, forms, exercise list, macro bars)
lib/                The app's logic
  exercises.ts      The library of ~100 exercises
  splits.ts         Picks the split from training days and goal
  generate.ts       Fills each day with exercises, sets and reps
  macros.ts         Calculates daily calorie and macro targets
  dates.ts          Builds the weekly schedule
  ai.ts             All the calls to Claude
  engine.test.ts    Tests for the logic above
  supabase/         Connects to Supabase from the browser and the server
proxy.ts            Sends logged-out visitors to the login page
supabase/schema.sql Database tables and security rules
```

### How a plan gets made

1. **Rules choose the plan.** `splits.ts` picks a split from how many days you train and your goal. `generate.ts` then picks exercises for each muscle, skips any that need equipment you don't have, and adds sport drills, extra work for your focus muscles, and finishers that fit your goal.
2. **Claude polishes it.** `ai.ts` asks Claude to explain the plan and fine-tune sets, reps and rest. If Claude is unavailable (for example, no credit left), the app still saves the rule-based plan.

Swaps work the same way: Claude can only pick from exercises in the library that you have equipment for.

### How macro targets are calculated

`macros.ts` uses the Mifflin-St Jeor formula for calories burned at rest, multiplies it by your activity level, and then adjusts for your goal: −20% for lean, +10% for muscular, +5% for strength. Protein is 2.0 g per kg of body weight (2.2 g for lean), fat is 25% of calories, and carbs make up the rest.

### Data and privacy

Each user's data is stored in Supabase. Row-level security rules in `schema.sql` make sure people can only see their own data. Food photos are sent to Claude for analysis and then thrown away. Only the macro numbers are saved.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Sign-up says it needs email confirmation turned off | Do setup step 2.4: turn off "Confirm email" in Supabase. |
| Errors like `relation "profiles" does not exist` | The database tables are missing. Run `supabase/schema.sql` again (setup step 2.3). |
| Plans have no explanation, or food analysis fails | Check `ANTHROPIC_API_KEY` in `.env.local` and make sure your Anthropic account has credit. |
| You changed `.env.local` but nothing happened | Stop the app with `Ctrl + C` and run `npm run dev` again. Settings are only read at startup. |
| `next: command not found` or missing modules | Run `npm install` first. |
| `node -v` shows a version below 20.9 | Install the current LTS version from https://nodejs.org. |

---

## Good to know

- AI macro estimates are approximations. Always check and edit them before saving.
- This app is a learning project, not medical or nutrition advice.
- The Next.js version here (16) is newer than many tutorials. For example, `proxy.ts` replaces the older `middleware.ts`. When in doubt, check the official docs at https://nextjs.org/docs.
