import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepository } from '@/data';
import {
  aggregatePlayerStats,
  type PlayerSeasonStats,
} from '@/domain/playerStats';
import { cn } from '@/lib/cn';
import { useT } from '@/store/LangContext';
import type { MatchRecord, Season } from '@/data/types';

/**
 * Season in review: the season's headline awards and leaderboards, computed
 * from championship matches only (training never counts). Reuses the pure
 * stats engine — nothing stored. Player names link to their profile.
 */
export function SeasonReview() {
  const navigate = useNavigate();
  const { t } = useT();
  const repo = useMemo(() => getRepository(), []);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [encounters, setEncounters] = useState(0);
  const [loading, setLoading] = useState(true);

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
    void Promise.all([
      repo.listMatches({ championship: true, seasonId }),
      repo.listEncounters(seasonId).catch(() => []),
    ])
      .then(([m, e]) => {
        if (!alive) return;
        setMatches(m);
        setEncounters(e.length);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repo, seasonId]);

  const stats = useMemo(
    () =>
      aggregatePlayerStats(
        matches.map((m) => ({ config: m.config, events: m.events })),
      ),
    [matches],
  );

  const top = (pick: (s: PlayerSeasonStats) => number) =>
    stats.reduce<PlayerSeasonStats | null>(
      (b, s) => (!b || pick(s) > pick(b) ? s : b),
      null,
    );
  const board = (
    pick: (s: PlayerSeasonStats) => number,
    fmt: (s: PlayerSeasonStats) => string,
  ) =>
    [...stats]
      .filter((s) => pick(s) > 0)
      .sort((a, b) => pick(b) - pick(a))
      .slice(0, 5)
      .map((s) => ({ s, value: fmt(s) }));

  const awards = [
    { icon: '⭐', label: t('award.mvp'), s: top((x) => x.average3), fmt: (x: PlayerSeasonStats) => x.average3.toFixed(1) },
    { icon: '🎯', label: t('award.bestCheckout'), s: top((x) => x.bestCheckout), fmt: (x: PlayerSeasonStats) => `${x.bestCheckout}` },
    { icon: '💯', label: t('award.most180s'), s: top((x) => x.count180), fmt: (x: PlayerSeasonStats) => `${x.count180}` },
    { icon: '🚀', label: t('award.bestFirst9'), s: top((x) => x.first9Average), fmt: (x: PlayerSeasonStats) => x.first9Average.toFixed(1) },
    { icon: '🏁', label: t('award.mostLegsWon'), s: top((x) => x.legsWon), fmt: (x: PlayerSeasonStats) => `${x.legsWon}` },
    { icon: '🥇', label: t('award.mostWins'), s: top((x) => x.matchesWon), fmt: (x: PlayerSeasonStats) => `${x.matchesWon}` },
  ];

  const seasonName = seasons.find((s) => s.id === seasonId)?.name ?? '';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-black">{t('admin.seasonReviewTitle')}</h2>
        <select
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isCurrent ? ` (${t('common.current')})` : ''}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-[var(--color-text-dim)]">
          {t('admin.reviewCounts')
            .replace('{matches}', String(matches.length))
            .replace('{encounters}', String(encounters))
            .replace('{players}', String(stats.length))}
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[var(--color-text-dim)]">{t('common.loading')}</p>
      ) : stats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-[var(--color-text-dim)]">
          {t('admin.noSeasonMatches').replace('{season}', seasonName || t('common.thisSeason'))}
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {awards.map((a) => (
              <button
                key={a.label}
                disabled={!a.s}
                onClick={() => a.s && navigate(`/admin/players/${a.s.playerId}`)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center transition-colors hover:border-[var(--color-accent)] disabled:opacity-50"
              >
                <div className="text-2xl">{a.icon}</div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-dim)]">
                  {a.label}
                </div>
                <div className="mt-0.5 truncate font-black">
                  {a.s ? a.s.name : '—'}
                </div>
                <div className="text-lg font-black text-[var(--color-accent)] tnum">
                  {a.s ? a.fmt(a.s) : '—'}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Leaderboard
              title={t('admin.topAverages')}
              rows={board((s) => s.average3, (s) => s.average3.toFixed(1))}
              onPick={(id) => navigate(`/admin/players/${id}`)}
            />
            <Leaderboard
              title={t('admin.most180s')}
              rows={board((s) => s.count180, (s) => `${s.count180}`)}
              onPick={(id) => navigate(`/admin/players/${id}`)}
            />
            <Leaderboard
              title={t('admin.mostLegsWon')}
              rows={board((s) => s.legsWon, (s) => `${s.legsWon}`)}
              onPick={(id) => navigate(`/admin/players/${id}`)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  onPick,
}: {
  title: string;
  rows: { s: PlayerSeasonStats; value: string }[];
  onPick: (playerId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-[var(--color-text-mute)]">—</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li key={r.s.playerId}>
              <button
                onClick={() => onPick(r.s.playerId)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <span
                  className={cn(
                    'w-5 shrink-0 text-center text-xs font-black',
                    i === 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]',
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.s.name}
                </span>
                <span className="tnum font-black">{r.value}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
