-- ============================================================================
-- Darts platform — initial schema (multi-season, event-sourced matches)
--
-- Design notes
--  * Matches stay EVENT-SOURCED: we persist { config, events } as jsonb and
--    recompute every stat with the same pure TypeScript engine. No stat is
--    ever stored denormalized -> always consistent and correctable.
--  * Multi-season is data-driven: adding 2027/2028, 2028/2029, ... is just a
--    new row in `seasons`. No schema change required.
--  * Security: anonymous = read-only; only authenticated users (the single
--    admin account) can write. Enforced by Row-Level Security (RLS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- updated_at helper -----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- seasons ---------------------------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,            -- e.g. '2026/2027'
  starts_on   date,
  ends_on     date,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Only one current season at a time.
create unique index if not exists seasons_one_current
  on public.seasons (is_current) where (is_current);

-- players ---------------------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists players_active_idx on public.players (active);
create index if not exists players_name_idx on public.players (lower(name));

drop trigger if exists trg_players_updated on public.players;
create trigger trg_players_updated before update on public.players
  for each row execute function public.set_updated_at();

-- matches (event log lives here) ----------------------------------------------
create table if not exists public.matches (
  id                  uuid primary key default gen_random_uuid(),
  season_id           uuid not null references public.seasons(id) on delete restrict,
  config              jsonb not null,                 -- GameConfig snapshot
  events              jsonb not null default '[]',    -- GameEvent[]
  -- denormalized columns for fast filtering (kept in sync from config/state)
  mode                text not null,                  -- 'SINGLE' | 'DOUBLE'
  variant             integer not null,               -- 501 | 601
  status              text not null default 'IN_PROGRESS', -- IN_PROGRESS|GAME_OVER|ABANDONED
  winner_participant  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  finished_at         timestamptz
);
create index if not exists matches_season_idx on public.matches (season_id);
create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_created_idx on public.matches (created_at);
create index if not exists matches_mode_idx on public.matches (mode);

drop trigger if exists trg_matches_updated on public.matches;
create trigger trg_matches_updated before update on public.matches
  for each row execute function public.set_updated_at();

-- match_players (link table -> fast per-player season filtering) ---------------
create table if not exists public.match_players (
  match_id        uuid not null references public.matches(id) on delete cascade,
  player_id       uuid not null references public.players(id) on delete restrict,
  participant_id  text not null,                      -- side within the match
  primary key (match_id, player_id)
);
create index if not exists match_players_player_idx on public.match_players (player_id);

-- ============================================================================
-- Seed: first season
-- ============================================================================
insert into public.seasons (name, starts_on, ends_on, is_current)
values ('2026/2027', '2026-09-01', '2027-08-31', true)
on conflict (name) do nothing;

-- ============================================================================
-- Row-Level Security: read = everyone, write = authenticated (admin) only
-- ============================================================================
alter table public.seasons       enable row level security;
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;

-- helper to (re)create a read+write policy pair on a table
do $$
declare t text;
begin
  foreach t in array array['seasons','players','matches','match_players'] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select using (true)', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end$$;
