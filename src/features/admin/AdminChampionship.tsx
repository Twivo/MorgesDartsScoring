import { useEffect, useMemo, useState } from 'react';
import { getRepository } from '@/data';
import { buildGameState } from '@/domain/engine';
import { participantDisplay } from '@/domain/presentation';
import { cn } from '@/lib/cn';
import { useT } from '@/store/LangContext';
import { MatchDetail } from './MatchDetail';
import type { EncounterRecord, MatchRecord, Season } from '@/data/types';

/**
 * Championship stats (independent). Lists encounters; opening one shows every
 * match, each clickable for a full match-by-match, leg-by-leg breakdown
 * (reuses the normal MatchDetail — forfeits included).
 */
export function AdminChampionship() {
  const { t } = useT();
  const repo = useMemo(() => getRepository(), []);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EncounterRecord | null>(null);

  useEffect(() => {
    void repo.listSeasons().then((s) => {
      setSeasons(s);
      const cur = s.find((x) => x.isCurrent) ?? s[0];
      if (cur) setSeasonId(cur.id);
    });
  }, [repo]);

  useEffect(() => {
    if (!seasonId) return;
    let alive = true;
    setLoading(true);
    void repo
      .listEncounters(seasonId)
      .then((e) => alive && setEncounters(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repo, seasonId]);

  if (selected) {
    return (
      <EncounterMatches encounter={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label className="text-[var(--color-text-dim)]">{t('admin.season')}</label>
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 outline-none"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isCurrent ? ` (${t('common.current')})` : ''}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[var(--color-text-dim)]">
          {encounters.length} {t('common.encounters')}
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[var(--color-text-dim)]">{t('common.loading')}</p>
      ) : encounters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-dim)]">
          {t('champ.noEncounters')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {encounters.map((e) => {
            const winnerName =
              e.winner === 'A'
                ? e.plan.teams.A.name
                : e.winner === 'B'
                  ? e.plan.teams.B.name
                  : null;
            return (
              <li key={e.id}>
                <button
                  onClick={() => setSelected(e)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent)]"
                >
                  <span
                    className={cn(
                      'rounded-lg px-2 py-0.5 text-xs font-bold',
                      e.status === 'FINISHED'
                        ? 'bg-[var(--color-success-dim)] text-[var(--color-success)]'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-dim)]',
                    )}
                  >
                    {e.status === 'FINISHED' ? t('common.final') : t('common.live')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {e.plan.teams.A.name} {t('common.vs')} {e.plan.teams.B.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-dim)]">
                      {e.createdAt
                        ? new Date(e.createdAt).toLocaleDateString()
                        : ''}
                      {winnerName ? ` · ${t('common.winner')} ${winnerName}` : ''}
                    </span>
                  </span>
                  <span className="text-lg font-black tnum">
                    {e.scoreA}–{e.scoreB}
                  </span>
                  <span className="text-[var(--color-text-dim)]">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EncounterMatches({
  encounter,
  onBack,
}: {
  encounter: EncounterRecord;
  onBack: () => void;
}) {
  const { t } = useT();
  const repo = useMemo(() => getRepository(), []);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void repo
      .listMatches({ encounterId: encounter.id })
      .then((m) =>
        alive && setMatches([...m].sort((a, b) => (a.fixtureIndex ?? 0) - (b.fixtureIndex ?? 0))),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repo, encounter.id]);

  const { teams } = encounter.plan;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg px-2 py-1 text-sm text-[var(--color-text-dim)] hover:bg-[var(--color-surface-2)]"
        >
          {t('common.back')} {t('common.encounters')}
        </button>
        <h2 className="text-lg font-black">
          {teams.A.name} {encounter.scoreA}–{encounter.scoreB} {teams.B.name}
        </h2>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[var(--color-text-dim)]">{t('common.loading')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m) => {
            const state = buildGameState(m.config, m.events);
            const forfeit = m.events.some((e) =>
              e.type === 'GAME_FORFEIT' || e.type === 'LEG_FORFEIT',
            );
            const winnerLabel =
              state.status === 'GAME_OVER' && state.winnerId
                ? participantDisplay(m.config, state.winnerId)
                : null;
            const legs = m.config.participants
              .map((p) => state.legsWon[p.id] ?? 0)
              .join('–');
            return (
              <li key={m.id}>
                <button
                  onClick={() => setDetailId(m.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent)]"
                >
                  <span className="w-14 shrink-0 text-xs font-bold text-[var(--color-accent)]">
                    {m.mode === 'DOUBLE' ? t('champ.double') : t('champ.single')}
                    <br />#{(m.fixtureIndex ?? 0) + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {m.config.participants
                        .map((p) => participantDisplay(m.config, p.id))
                        .join(`  ${t('common.vs')}  `)}
                    </span>
                    <span className="text-xs text-[var(--color-text-dim)]">
                      {winnerLabel ? `${t('common.winner')} ${winnerLabel}` : t('common.inProgress')}
                      {forfeit && (
                        <span className="ml-1 text-[var(--color-warning)]">
                          · {t('common.forfeit')}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="font-black tnum">{legs}</span>
                  <span className="text-[var(--color-text-dim)]">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <MatchDetail
        match={matches.find((m) => m.id === detailId) ?? null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
