-- ============================================================================
-- Live spectating + single-scorer lock.
--
-- 1. Realtime: broadcast `matches` row changes so read-only spectators can
--    follow a game live (no polling needed).
-- 2. Scoring lock: the device actively scoring a match holds a short-lived
--    heartbeat lock (locked_by + locked_at). Another device can only WATCH
--    while the lock is fresh; it can take control once the lock goes stale
--    (the scoring device closed / lost connection).
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Enable realtime on matches (ignore if already in the publication).
do $$
begin
  alter publication supabase_realtime add table public.matches;
exception
  when duplicate_object then null;
end $$;

-- 2. Lock columns. RLS already governs who may UPDATE a match row:
--    regular matches are anon-updatable, championship matches require the
--    admin — so locking inherits exactly the right permissions.
alter table public.matches add column if not exists locked_by text;
alter table public.matches add column if not exists locked_at timestamptz;
