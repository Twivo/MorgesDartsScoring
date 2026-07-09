-- ============================================================================
-- Open scoring: matches can be created & scored WITHOUT signing in.
--
-- Players and seasons remain admin-only (authenticated). For matches, anyone
-- (anon) may insert and update; only the admin (authenticated) may delete, so
-- match history can't be wiped by anonymous users.
-- ============================================================================

-- matches: replace the admin-only write policy with granular public ones
drop policy if exists "matches_write" on public.matches;

create policy "matches_insert" on public.matches
  for insert with check (true);                 -- anon + authenticated

create policy "matches_update" on public.matches
  for update using (true) with check (true);    -- anon + authenticated

create policy "matches_delete" on public.matches
  for delete to authenticated using (true);     -- admin only

-- match_players: anon may link players to a match; admin may remove
drop policy if exists "match_players_write" on public.match_players;

create policy "match_players_insert" on public.match_players
  for insert with check (true);

create policy "match_players_delete" on public.match_players
  for delete to authenticated using (true);
