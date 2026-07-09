import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { getRepository } from '@/data';
import type { TeamWithPlayers } from '@/data/types';
import { useRoster } from '@/store/RosterContext';
import { useT } from '@/store/LangContext';
import { createEncounter, persistEncounter } from '@/store/encounterService';
import type { TeamSnapshot } from '@/domain/championship/types';

function isJedisTeam(team: TeamWithPlayers) {
  return /\bjedis?\b/i.test(team.name.trim());
}

export function EncounterSetup() {
  const navigate = useNavigate();
  const repo = useMemo(() => getRepository(), []);
  const { players } = useRoster();
  const { t } = useT();

  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoSelectedHome = useRef(false);

  useEffect(() => {
    void repo
      .listTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [repo]);

  useEffect(() => {
    if (autoSelectedHome.current || teamAId || teams.length === 0) return;
    const jedis = teams.find(isJedisTeam);
    if (!jedis) return;

    autoSelectedHome.current = true;
    setTeamAId(jedis.id);
    if (teamBId === jedis.id) setTeamBId('');
  }, [teamAId, teamBId, teams]);

  const jediTeamId = useMemo(
    () => teams.find(isJedisTeam)?.id ?? '',
    [teams],
  );

  const snapshot = (t: TeamWithPlayers): TeamSnapshot => ({
    id: t.id,
    name: t.name,
    players: t.playerIds.map((id) => ({
      id,
      name: players.find((p) => p.id === id)?.name ?? '???',
    })),
  });

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);
  const valid =
    teamA && teamB && teamAId !== teamBId &&
    teamA.playerIds.length >= 4 && teamB.playerIds.length >= 4;

  const hint = !teamA || !teamB
    ? t('encounterSetup.pickBoth')
    : teamAId === teamBId
      ? t('encounterSetup.differentTeams')
      : teamA.playerIds.length < 4 || teamB.playerIds.length < 4
        ? t('encounterSetup.minPlayers')
        : null;

  const start = async () => {
    if (!valid || !teamA || !teamB || busy) return;
    setBusy(true);
    setError(null);
    try {
      const season = await repo.getCurrentSeason();
      if (!season) throw new Error(t('encounterSetup.noSeason'));
      const encounter = createEncounter(
        season.id,
        snapshot(teamA),
        snapshot(teamB),
      );
      await persistEncounter(encounter);
      navigate(`/championship/${encounter.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('encounterSetup.createFailed'));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          {t('common.back')}
        </Button>
        <h1 className="text-2xl font-bold">{t('encounterSetup.title')}</h1>
      </header>

      <p className="mb-4 text-sm text-[var(--color-text-dim)]">
        {t('encounterSetup.description')}
      </p>

      <TeamPicker
        label={t('encounterSetup.homeTeam')}
        teams={teams}
        value={teamAId}
        exclude={teamBId}
        featuredId={jediTeamId}
        preferFeatured
        homeLabel={t('encounterSetup.homeBadge')}
        playerLabel={t('common.player')}
        playersLabel={t('common.players')}
        onChange={setTeamAId}
      />
      <div className="my-3 text-center text-sm font-bold text-[var(--color-text-dim)]">
        {t('common.vs')}
      </div>
      <TeamPicker
        label={t('encounterSetup.opponent')}
        teams={teams}
        value={teamBId}
        exclude={teamAId}
        featuredId={jediTeamId}
        homeLabel={t('encounterSetup.homeBadge')}
        playerLabel={t('common.player')}
        playersLabel={t('common.players')}
        onChange={setTeamBId}
      />

      {teams.length === 0 && (
        <p className="mt-4 text-center text-sm text-[var(--color-warning)]">
          {t('encounterSetup.noTeams')}
        </p>
      )}
      {hint && teams.length > 0 && (
        <p className="mt-4 text-center text-sm text-[var(--color-warning)]">
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-3 text-center text-sm text-[var(--color-accent)]">
          {error}
        </p>
      )}

      <Button
        variant="accent"
        size="xl"
        fullWidth
        className="mt-6"
        disabled={!valid || busy}
        onClick={start}
      >
        {busy ? t('encounterSetup.creating') : t('encounterSetup.composeFirst')}
      </Button>
    </div>
  );
}

function TeamPicker({
  label,
  teams,
  value,
  exclude,
  featuredId,
  preferFeatured = false,
  homeLabel,
  playerLabel,
  playersLabel,
  onChange,
}: {
  label: string;
  teams: TeamWithPlayers[];
  value: string;
  exclude: string;
  featuredId?: string;
  preferFeatured?: boolean;
  homeLabel: string;
  playerLabel: string;
  playersLabel: string;
  onChange: (id: string) => void;
}) {
  const orderedTeams = [...teams].sort((a, b) => {
    const aFeatured = a.id === featuredId;
    const bFeatured = b.id === featuredId;
    if (aFeatured !== bFeatured) {
      if (preferFeatured) return aFeatured ? -1 : 1;
      return aFeatured ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
        {label}
      </h2>
      <div className="flex flex-col gap-2">
        {orderedTeams.map((t) => {
          const featured = t.id === featuredId;
          const selected = value === t.id;
          const compact =
            !selected && !!featuredId && (preferFeatured ? !featured : featured);

          return (
            <button
              key={t.id}
              disabled={t.id === exclude}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex items-center justify-between gap-3 border text-left transition-all disabled:opacity-30',
                compact
                  ? 'rounded-lg px-3 py-2 text-xs opacity-55'
                  : 'rounded-xl px-4 py-3 text-sm',
                selected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                  : featured && preferFeatured
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{t.name}</span>
                {featured && (
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      selected
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
                    )}
                  >
                    {homeLabel}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 text-xs',
                  selected ? 'text-white/80' : 'text-[var(--color-text-dim)]',
                )}
              >
                {t.playerIds.length} {t.playerIds.length === 1 ? playerLabel : playersLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
