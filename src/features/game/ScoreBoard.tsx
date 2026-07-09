import { useGame } from '@/store/GameContext';
import { cn } from '@/lib/cn';
import { participantLabel } from '@/domain/presentation';
import { useT } from '@/store/LangContext';

/**
 * Scoreboard with the big central remaining score.
 *
 * The central score decrements LIVE as the player types (liveRemaining =
 * remainingBefore - typed). Touching it commits the visit (same as VALIDATE).
 * Validation errors are surfaced right under the score.
 */
export function ScoreBoard({
  liveRemaining,
  hasInput,
  error,
  onCommit,
}: {
  liveRemaining: number;
  hasInput: boolean;
  error: string | null;
  onCommit: () => void;
}) {
  const { config, state } = useGame();
  const { t } = useT();
  const { activeParticipantId, remaining, legsWon, stats } = state;

  return (
    <div className="px-4 pt-3">
      <div className="grid grid-cols-2 gap-2">
        {config.participants.map((p) => {
          const isActive = p.id === activeParticipantId;
          const s = stats.byParticipant[p.id];
          return (
            <div
              key={p.id}
              className={cn(
                'rounded-xl border px-3 py-2.5 transition-all',
                isActive
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)] shadow-[0_2px_16px_-8px_var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-65',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-semibold">
                  {participantLabel(config, p.id)}
                </span>
                <span className="text-xs font-bold text-[var(--color-accent)]">
                  ● {legsWon[p.id] ?? 0}
                </span>
              </div>
              <div className="text-3xl font-black tnum">
                {remaining[p.id] ?? 0}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                <span>{t('game.avg')} {s ? s.average3.toFixed(1) : '0.0'}</span>
                <span className="text-[var(--color-text-mute)]">·</span>
                <span>{s ? s.totalDarts : 0} {t('game.darts')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onCommit}
        className={cn(
          'mt-2 w-full rounded-2xl border-2 py-1 text-center transition-all active:scale-[0.99]',
          error
            ? 'animate-shake border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
            : 'border-transparent',
        )}
      >
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-dim)]">
          {hasInput ? t('game.remainingTap') : t('game.remaining')}
        </div>
        <div
          className={cn(
            'font-black tnum leading-none text-6xl sm:text-7xl lg:text-[92px]',
            error
              ? 'text-[var(--color-accent)]'
              : hasInput
                ? 'text-[var(--color-accent-hover)]'
                : 'text-[var(--color-text)]',
          )}
        >
          {liveRemaining}
        </div>
        <div className="mt-0.5 h-4 text-xs font-semibold">
          {error ? (
            <span className="text-[var(--color-accent)]">{error}</span>
          ) : (
            <span className="text-transparent">.</span>
          )}
        </div>
      </button>
    </div>
  );
}
