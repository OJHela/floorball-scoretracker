# Floorball Scoretracker MVP

React (Next.js) MVP for the Floorball score tracking app outlined in `Scoretracker.md`. Supabase powers persistence, authentication, and league sharing so rosters, weekly sessions, and leaderboards stay in sync across devices.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and paste your Supabase keys:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from **Settings → API** in Supabase. Set `NEXT_PUBLIC_APP_URL` to your production domain (for local dev you can leave it blank).
3. Enable Supabase email/password auth and disable email confirmations under **Authentication → Providers → Email** (toggle off "Confirm email") so new accounts are active immediately.
4. Seed the database with the schema below (SQL editor → New query → Run).
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Visit `http://localhost:3000`. Sign in with your email (you’ll receive a magic link), create a league, and start tracking games. Anyone with a share link can access and update that league without signing in.

### Supabase Schema

Run the full script once on a new project, or apply the `alter table` lines if you are upgrading from the earlier single-league version.

```sql
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  attendance_points integer not null default 1,
  goal_points integer not null default 1,
  win_bonus integer not null default 5,
  enable_assists boolean not null default false,
  assist_points integer not null default 1
);

create unique index leagues_public_token_idx on public.leagues (public_token);

create table public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'admin',
  inserted_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_at timestamptz not null default now(),
  team_a_score integer not null,
  team_b_score integer not null,
  winner text not null check (winner in ('A', 'B', 'Tie'))
);

create table public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  goals integer not null default 0,
  assists integer not null default 0,
  attendance boolean not null default true,
  week_points integer not null default 0,
  inserted_at timestamptz not null default now()
);

create table public.live_games (
  league_id uuid primary key references public.leagues(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index players_league_idx on public.players (league_id);
create index sessions_league_idx on public.sessions (league_id);
create index session_players_session_idx on public.session_players (session_id);
create index session_players_player_idx on public.session_players (player_id);

alter publication supabase_realtime add table public.live_games;

-- Upgrade helpers (run only if you already have the older schema)
-- alter table public.players add column league_id uuid references public.leagues(id) on delete cascade;
-- alter table public.sessions add column league_id uuid references public.leagues(id) on delete cascade;
-- alter table public.leagues add column if not exists attendance_points integer not null default 1;
-- alter table public.leagues add column if not exists goal_points integer not null default 1;
-- alter table public.leagues add column if not exists win_bonus integer not null default 5;
-- alter table public.leagues add column if not exists enable_assists boolean not null default false;
-- alter table public.leagues add column if not exists assist_points integer not null default 1;
-- alter table public.session_players add column if not exists assists integer not null default 0;
```

Grant the `anon` role read access and the `service_role` key full access, or configure row-level security rules if you want more fine-grained control.

## Feature Map

- **Account-linked leagues** – users sign in with a passwordless email link, can create multiple leagues, switch between them, and share the same roster/sessions across devices.
- **Public share links** – each league gets a unique `?token=` link. Anyone with the link can manage rosters, record games, and view the leaderboard without signing in.
- **Roster management** – add, rename, and remove up to 40 players per league.
- **Weekly setup** – choose attendees and split teams A/B before each session.
- **Live scoring** – mobile-first, real-time scorekeeper with goal/assist controls, optional game clock, and multi-device sync.
- **Game summary** – auto-calculates attendance, goals, assists, and winner bonus based on league rules.
- **Season history & leaderboard** – aggregates all saved sessions per league to show trends and standings.
- **Scoring rules** – league owners can adjust attendance, goal, assist, and win-bonus points per league.
- **Session management** – admins can delete saved games directly from the history view.
- **Offline fallback** – the live scoreboard keeps running locally when the network drops and syncs once you reconnect.

The UI is responsive and uses the API routes under `app/api` to communicate with Supabase. Use them as reference points if you need to integrate the MVP with other services.
