-- ============================================================================
-- Clearly distinguish training (New Game) matches from championship matches.
--
-- A match belongs to a championship exactly when it is linked to an encounter.
-- `is_training` makes that explicit and queryable at the DB level: training
-- games must never feed championship / player stats, rankings or averages.
-- Generated, so it can never drift from encounter_id.
-- ============================================================================
alter table public.matches
  add column if not exists is_training boolean
  generated always as (encounter_id is null) stored;

comment on column public.matches.is_training is
  'True for New Game (training) matches; false for championship matches. Stats use championship only.';
