import { useGame } from '@/store/GameContext';
import { Button } from '@/components/ui/Button';
import { participantLabel } from '@/domain/presentation';
import type { ParticipantStats } from '@/domain/types';
import { useT } from '@/store/LangContext';
import { Confetti } from './Confetti';

interface StatRow {
  key: string;
  format: (s: ParticipantStats) => string;
  /** higher is better (for highlighting) */
  better?: 'high' | 'low';
}

const ROWS: StatRow[] = [
  { key: 'legs', format: (s) => String(s.legsWon), better: 'high' },
  { key: 'avg', format: (s) => s.average3.toFixed(1), better: 'high' },
  { key: 'first9', format: (s) => s.first9Average.toFixed(1), better: 'high' },
  { key: 'darts', format: (s) => String(s.totalDarts), better: 'low' },
  { key: 'best', format: (s) => (s.bestLegDarts != null && s.bestLegDarts >= 9 ? `${s.bestLegDarts}` : '—'), better: 'low' },
  { key: 'worst', format: (s) => (s.worstLegDarts ?? '—').toString(), better: 'high' },
  { key: 'high', format: (s) => String(s.highestVisit), better: 'high' },
  { key: '180', format: (s) => String(s.count180), better: 'high' },
  { key: '140', format: (s) => String(s.count140plus), better: 'high' },
  { key: '100', format: (s) => String(s.count100plus), better: 'high' },
  { key: '60', format: (s) => String(s.count60plus), better: 'high' },
  { key: 'bust', format: (s) => String(s.busts), better: 'low' },
];

export function StatsScreen() {
  const { config, state, endGame, undo } = useGame();
  const { t } = useT();
  const winnerLabel = state.winnerId
    ? participantLabel(config, state.winnerId)
    : t('common.dash');

  const parts = config.participants;

  const best = (row: StatRow): string | null => {
    if (!row.better) return null;
    let bestId: string | null = null;
    let bestVal = row.better === 'high' ? -Infinity : Infinity;
    for (const p of parts) {
      const s = state.stats.byParticipant[p.id];
      if (!s) continue;
      const raw = numericFor(row.key, s);
      if (raw === null) continue;
      if (
        (row.better === 'high' && raw > bestVal) ||
        (row.better === 'low' && raw < bestVal)
      ) {
        bestVal = raw;
        bestId = p.id;
      }
    }
    return bestId;
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Confetti />
      <div className="relative z-50 text-center">
        <div className="mb-2 text-6xl">🏆</div>
        <h1 className="text-3xl font-black">
          {t('stats.winner').replace('{winner}', winnerLabel)}
        </h1>
        <p className="mt-1 text-[var(--color-text-dim)]">
          {config.variant} {t('game.doubleOut')} · {Object.values(state.legsWon).join(' — ')}
        </p>
      </div>

      <div className="relative z-50 mt-8 overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-2)]">
              <th className="px-3 py-3 text-left font-semibold">{t('stats.statistic')}</th>
              {parts.map((p) => (
                <th key={p.id} className="px-3 py-3 text-right font-bold">
                  {participantLabel(config, p.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const bestId = best(row);
              return (
                <tr
                  key={row.key}
                  className={i % 2 ? 'bg-[var(--color-surface)]' : ''}
                >
                  <td className="px-3 py-2.5 text-[var(--color-text-dim)]">
                    {t(`stats.row.${row.key}`)}
                  </td>
                  {parts.map((p) => {
                    const s = state.stats.byParticipant[p.id];
                    const isBest = bestId === p.id;
                    return (
                      <td
                        key={p.id}
                        className={
                          'px-3 py-2.5 text-right font-bold tabular-nums ' +
                          (isBest
                            ? 'text-[var(--color-accent-hover)]'
                            : 'text-[var(--color-text)]')
                        }
                      >
                        {s ? row.format(s) : t('common.dash')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="relative z-50 mt-8 flex flex-col gap-3">
        <Button variant="surface" size="lg" fullWidth onClick={undo}>
          {t('stats.correctScore')}
        </Button>
        <Button variant="accent" size="xl" fullWidth onClick={endGame}>
          {t('home.new')}
        </Button>
      </div>
    </div>
  );
}

function numericFor(key: string, s: ParticipantStats): number | null {
  switch (key) {
    case 'legs': return s.legsWon;
    case 'avg': return s.average3;
    case 'first9': return s.first9Average;
    case 'darts': return s.totalDarts;
    case 'co': return s.checkoutsHit;
    case 'copct': return s.checkoutPercent;
    case 'best': return s.bestLegDarts != null && s.bestLegDarts >= 9 ? s.bestLegDarts : null;
    case 'worst': return s.worstLegDarts ?? null;
    case 'high': return s.highestVisit;
    case '180': return s.count180;
    case '140': return s.count140plus;
    case '100': return s.count100plus;
    case '60': return s.count60plus;
    case 'bust': return s.busts;
    default: return null;
  }
}
