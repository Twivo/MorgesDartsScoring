-- ============================================================================
-- Championship mode: teams (many-to-many with players) and encounters.
--
-- An "encounter" is a tie between two teams made of a fixed sequence of
-- fixtures (4 singles, 2 doubles, 4 singles). Each played fixture reuses the
-- normal `matches` engine, tagged with encounter_id + fixture_index so it stays
-- out of the regular stats and feeds the championship stats instead.
--
-- Security: teams and encounters (championship scoring) require the admin
-- account (authenticated). Regular matches stay public.
-- ============================================================================

-- teams -----------------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_name_idx on public.teams (lower(name));

drop trigger if exists trg_teams_updated on public.teams;
create trigger trg_teams_updated before update on public.teams
  for each row execute function public.set_updated_at();

-- team_players (many-to-many; a player may belong to several teams) -----------
create table if not exists public.team_players (
  team_id   uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (team_id, player_id)
);
create index if not exists team_players_player_idx on public.team_players (player_id);

-- encounters ------------------------------------------------------------------
create table if not exists public.encounters (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons(id) on delete restrict,
  team_a_id     uuid not null references public.teams(id) on delete restrict,
  team_b_id     uuid not null references public.teams(id) on delete restrict,
  plan          jsonb not null,            -- fixtures + compositions + settings
  status        text not null default 'IN_PROGRESS', -- IN_PROGRESS|FINISHED|ABANDONED
  current_index integer not null default 0,
  score_a       integer not null default 0,
  score_b       integer not null default 0,
  winner        text,                       -- 'A' | 'B' | null
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists encounters_status_idx on public.encounters (status);
create index if not exists encounters_season_idx on public.encounters (season_id);

drop trigger if exists trg_encounters_updated on public.encounters;
create trigger trg_encounters_updated before update on public.encounters
  for each row execute function public.set_updated_at();

-- link matches to encounters (nullable -> regular matches unaffected) ----------
alter table public.matches add column if not exists encounter_id uuid
  references public.encounters(id) on delete cascade;
alter table public.matches add column if not exists fixture_index integer;
create index if not exists matches_encounter_idx on public.matches (encounter_id);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.teams        enable row level security;
alter table public.team_players enable row level security;
alter table public.encounters   enable row level security;

-- teams / team_players / encounters: read public, write admin (authenticated)
do $$
declare t text;
begin
  foreach t in array array['teams','team_players','encounters'] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format('create policy "%s_read" on public.%I for select using (true)', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end$$;

-- matches: championship matches (encounter_id set) require authentication;
-- regular matches (encounter_id null) stay publicly writable.
drop policy if exists "matches_insert" on public.matches;
drop policy if exists "matches_update" on public.matches;

create policy "matches_insert" on public.matches
  for insert
  with check (encounter_id is null or (select auth.role()) = 'authenticated');

create policy "matches_update" on public.matches
  for update
  using (encounter_id is null or (select auth.role()) = 'authenticated')
  with check (encounter_id is null or (select auth.role()) = 'authenticated');
