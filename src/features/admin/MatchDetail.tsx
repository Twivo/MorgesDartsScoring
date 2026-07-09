import { Modal } from '@/components/ui/Modal';
import { buildGameState } from '@/domain/engine';
import { aggregatePlayerStats } from '@/domain/playerStats';
import { participantDisplay } from '@/domain/presentation';
import { cn } from '@/lib/cn';
import { useT } from '@/store/LangContext';
import type { MatchRecord } from '@/data/types';
import type { LegState, ResolvedVisit } from '@/domain/types';

/** Full match detail: summary, per-player stats, and leg-by-leg scoring. */
export function MatchDetail({
  match,
  onClose,
}: {
  match: MatchRecord | null;
  onClose: () => void;
}) {
  const { t } = useT();
  if (!match) return null;
  const { config } = match;
  const state = buildGameState(config, match.events);
  const stats = aggregatePlayerStats([{ config, events: match.events }]);
  const parts = config.participants;

  const winner =
    state.status === 'GAME_OVER' && state.winnerId
      ? participantDisplay(config, state.winnerId)
      : null;

  const STAT_ROWS: { label: string; get: (id: string) => string }[] = [
    { label: t('stats.row.legs'), get: (id) => `${state.legsWon[id] ?? 0}` },
    { label: t('stats.row.avg'), get: (id) => statOf(id, (s) => s.average3.toFixed(1)) },
    { label: t('stats.row.first9'), get: (id) => statOf(id, (s) => s.first9Average.toFixed(1)) },
    { label: t('award.bestCheckout'), get: (id) => statOf(id, (s) => `${s.bestCheckout}`) },
    { label: '180', get: (id) => statOf(id, (s) => `${s.count180}`) },
    { label: '140+', get: (id) => statOf(id, (s) => `${s.count140plus}`) },
    { label: '100+', get: (id) => statOf(id, (s) => `${s.count100plus}`) },
    { label: '60+', get: (id) => statOf(id, (s) => `${s.count60plus}`) },
    { label: t('stats.row.bust'), get: (id) => statOf(id, (s) => `${s.busts}`) },
    { label: t('stats.row.high'), get: (id) => statOf(id, (s) => `${s.highestVisit}`) },
    { label: t('stats.row.darts'), get: (id) => statOf(id, (s) => `${s.totalDarts}`) },
  ];

  // resolve a participant's stat (in SINGLE the participant is one player;
  // in DOUBLE we sum both players on the side).
  function statOf(participantId: string, fmt: (s: ReturnType<typeof agg>) => string) {
    const p = parts.find((x) => x.id === participantId);
    if (!p) return '—';
    const acc = agg(p.playerIds);
    return fmt(acc);
  }
  function agg(playerIds: string[]) {
    const rows = stats.filter((s) => playerIds.includes(s.playerId));
    const sum = (f: (r: (typeof rows)[number]) => number) =>
      rows.reduce((t, r) => t + f(r), 0);
    const scored = sum((r) => r.totalScored);
    const darts = sum((r) => r.totalDarts);
    return {
      average3: darts ? (scored / darts) * 3 : 0,
      first9Average: rows[0]?.first9Average ?? 0,
      checkoutPercent: rows[0]?.checkoutPercent ?? 0,
      bestCheckout: Math.max(0, ...rows.map((r) => r.bestCheckout)),
      count180: sum((r) => r.count180),
      count140plus: sum((r) => r.count140plus),
      count100plus: sum((r) => r.count100plus),
      count60plus: sum((r) => r.count60plus),
      busts: sum((r) => r.busts),
      highestVisit: Math.max(0, ...rows.map((r) => r.highestVisit)),
      totalDarts: darts,
    };
  }

  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      <div className="max-h-[82vh] overflow-y-auto pr-1">
        {/* summary */}
        <div className="mb-4">
          <h2 className="text-xl font-black">
            {parts.map((p) => participantDisplay(config, p.id)).join(`  ${t('common.vs')}  `)}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-dim)]">
            {match.variant} {t(match.mode === 'DOUBLE' ? 'game.doubles' : 'game.singles')} ·{' '}
            {match.createdAt ? new Date(match.createdAt).toLocaleString() : ''} ·{' '}
            {winner ? (
              <span className="text-[var(--color-success)]">{t('common.winner')}: {winner}</span>
            ) : (
              t('common.inProgress')
            )}{' '}
            · {t('game.legs')} {parts.map((p) => state.legsWon[p.id] ?? 0).join('–')}
          </p>
        </div>

        {/* per-player stats */}
        <div className="mb-5 overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface-2)]">
                <th className="px-3 py-2 text-left font-semibold">{t('stats.row.stat')}</th>
                {parts.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-right font-bold">
                    {participantDisplay(config, p.id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 ? 'bg-[var(--color-surface)]' : ''}>
                  <td className="px-3 py-1.5 text-[var(--color-text-dim)]">
                    {row.label}
                  </td>
                  {parts.map((p) => (
                    <td key={p.id} className="px-3 py-1.5 text-right font-semibold tnum">
                      {row.get(p.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* leg-by-leg scoring */}
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
          {t('admin.scoring')}
        </h3>
        <div className="flex flex-col gap-4">
          {state.legs.map((leg) => (
            <LegBreakdown key={leg.index} leg={leg} config={config} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function LegBreakdown({
  leg,
  config,
}: {
  leg: LegState;
  config: MatchRecord['config'];
}) {
  const { t } = useT();
  const parts = config.participants;
  const byPart = parts.map((p) => ({
    id: p.id,
    visits: leg.visits.filter((v) => v.participantId === p.id),
  }));
  const rounds = Math.max(0, ...byPart.map((c) => c.visits.length));
  const winnerLabel = leg.winnerId
    ? participantDisplay(config, leg.winnerId)
    : null;

  return (
    <div className="rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5 text-xs">
        <span className="font-bold">{t('game.leg')} {leg.index + 1}</span>
        {winnerLabel && (
          <span className="text-[var(--color-success)]">
            {winnerLabel} {t('common.won')}{leg.endReason ? ` (${leg.endReason.toLowerCase()})` : ''}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-2 px-2 py-1">
        {byPart.map((c) => (
          <div
            key={c.id}
            className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-dim)]"
          >
            {participantDisplay(config, c.id)}
          </div>
        ))}
        {Array.from({ length: rounds }, (_, r) =>
          byPart.map((c) => <Cell key={`${c.id}-${r}`} v={c.visits[r]} />),
        )}
      </div>
    </div>
  );
}

function Cell({ v }: { v: ResolvedVisit | undefined }) {
  const { t } = useT();
  if (!v) return <div className="px-1 py-0.5" />;
  return (
    <div className="flex items-center justify-between px-1.5 py-0.5 text-sm">
      <span
        className={cn(
          'font-bold tnum',
          v.isBust && 'text-[var(--color-accent)]',
          v.isCheckout && 'text-[var(--color-success)]',
        )}
      >
        {v.isBust ? t('game.bust') : v.effectiveScore}
        {v.isCheckout && ' ✓'}
      </span>
      <span className="text-xs text-[var(--color-text-mute)] tnum">
        {v.remainingAfter} · {v.event.darts}d
      </span>
    </div>
  );
}
