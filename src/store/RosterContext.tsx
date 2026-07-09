/** Players roster, backed by the repository (Supabase or local fallback). */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getRepository } from '@/data';
import type { PlayerInput } from '@/data/repository';
import type { PlayerRecord } from '@/data/types';

const PALETTE = [
  '#ef2b2d',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#9333ea',
  '#0891b2',
];

interface RosterContextValue {
  players: PlayerRecord[];
  /** Active players only — used to build matches. */
  activePlayers: PlayerRecord[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addPlayer: (name: string, color?: string) => Promise<void>;
  updatePlayer: (id: string, patch: Partial<PlayerInput>) => Promise<void>;
  setActive: (id: string, active: boolean) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
}

const RosterContext = createContext<RosterContextValue | null>(null);

export function RosterProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepository(), []);
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlayers(await repo.listPlayers({ sortBy: 'name' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addPlayer = useCallback(
    async (name: string, color?: string) => {
      await repo.createPlayer({
        name: name.trim(),
        color: color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
      await reload();
    },
    [repo, reload],
  );

  const updatePlayer = useCallback(
    async (id: string, patch: Partial<PlayerInput>) => {
      await repo.updatePlayer(id, patch);
      await reload();
    },
    [repo, reload],
  );

  const setActive = useCallback(
    async (id: string, active: boolean) => {
      await repo.updatePlayer(id, { active });
      await reload();
    },
    [repo, reload],
  );

  const removePlayer = useCallback(
    async (id: string) => {
      await repo.deletePlayer(id);
      await reload();
    },
    [repo, reload],
  );

  const value = useMemo<RosterContextValue>(
    () => ({
      players,
      activePlayers: players.filter((p) => p.active),
      loading,
      error,
      reload,
      addPlayer,
      updatePlayer,
      setActive,
      removePlayer,
    }),
    [players, loading, error, reload, addPlayer, updatePlayer, setActive, removePlayer],
  );

  return (
    <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
  );
}

export function useRoster(): RosterContextValue {
  const ctx = useContext(RosterContext);
  if (!ctx) throw new Error('useRoster must be used within a RosterProvider');
  return ctx;
}
