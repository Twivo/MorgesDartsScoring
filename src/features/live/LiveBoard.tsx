import type { GameState, ResolvedVisit } from '@/domain/types';
import { participantDisplay, playerName } from '@/domain/presentation';
import { cn } from '@/lib/cn';
import { useT } from '@/store/LangContext';

export interface EncounterContext {
  aName: string;
  bName: string;
  scoreA: number;
  scoreB: number;
  label: string;
}

/**
 * Read-only broadcast scoreboard. Given a rebuilt GameState, it shows both
 * sides' remaining, legs, averages, who's throwing and the current leg's
 * visit history — the DartConnect-style spectator view. It never mutates
 * anything: purely a projection of the engine's derived state.
 */
export function LiveBoard({
  state,
  encounter,
}: {
  state: GameState;
  encounter?: EncounterContext | null;
}) {
  const { t } = useT();
  const { config } = state;
  const parts = config.participants;
  const [p0, p1] = parts;
  const over = state.status === 'GAME_OVER';
  const leg = state.legs[state.currentLegIndex];

  const visitsByPart: Record<string, ResolvedVisit[]> = {};
  for (const p of parts) visitsByPart[p.id] = [];
  for (const v of leg?.visits ?? []) visitsByPart[v.participantId]?.push(v);
  const rounds = Math.max(0, ...parts.map((p) => visitsByPart[p.id]?.length ?? 0));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {encounter && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          <span className="text-[var(--color-warning)]">🏆</span>
          <span className="font-semibold">{encounter.aName}</span>
          <span className="text-lg font-black tnum">
            {encounter.scoreA}
            <span className="mx-1 text-[var(--color-text-mute)]">–</span>
            {encounter.scoreB}
          </span>
          <span className="font-semibold">{encounter.bName}</span>
          <span className="text-[var(--color-text-dim)]">· {encounter.label}</span>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        {over ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-[var(--color-success-dim)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
            {t('common.final').toUpperCase()}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t('common.live').toUpperCase()}
          </span>
        )}
        <span className="text-xs text-[var(--color-text-dim)]">
          {config.variant} {t('game.doubleOut')} · {t('game.firstTo')} {config.legsToWin}
        </span>
      </div>

      {p0 && p1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-[var(--color-text-dim)]">
            {participantDisplay(config, p0.id)}
          </span>
          <span className="shrink-0 text-3xl font-black tnum sm:text-4xl">
            {state.legsWon[p0.id] ?? 0}
            <span className="mx-2 text-[var(--color-text-mute)]">–</span>
            {state.legsWon[p1.id] ?? 0}
          </span>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[var(--color-text-dim)]">
            {participantDisplay(config, p1.id)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {parts.map((p) => {
          const isActive = !over && p.id === state.activeParticipantId;
          const isWinner = over && p.id === state.winnerId;
          const rem = state.remaining[p.id] ?? 0;
          const s = state.stats.byParticipant[p.id];
          const onFinish = isActive && rem > 1 && rem <= 170;
          return (
            <div
              key={p.id}
              className={cn(
                'rounded-2xl border-2 px-3 py-3 transition-all sm:px-4',
                isActive || isWinner
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-70',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">
                  {participantDisplay(config, p.id)}
                </span>
                {isActive && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                    ▸ {t('game.throwing')}
                  </span>
                )}
                {isWinner && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-success)]">
                    {t('game.winner')}
                  </span>
                )}
              </div>
              <div className="mt-1 text-5xl font-black leading-none tnum sm:text-6xl">
                {rem}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-text-dim)]">
                <span>
                  {t('game.legs')}{' '}
                  <b className="font-bold text-[var(--color-text)]">
                    {state.legsWon[p.id] ?? 0}
                  </b>
                </span>
                <span>
                  {t('game.avg')}{' '}
                  <b className="font-bold text-[var(--color-text)]">
                    {s ? s.average3.toFixed(1) : '0.0'}
                  </b>
                </span>
              </div>
              {config.mode === 'DOUBLE' && isActive && (
                <div className="mt-1 text-xs text-[var(--color-accent)]">
                  {t('game.toThrow').replace(
                    '{player}',
                    playerName(config, state.activePlayerId),
                  )}
                </div>
              )}
              {onFinish && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--color-warning)]">
                  🎯 {t('game.checkout').replace('{score}', String(rem))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {p0 && p1 && rounds > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
          <div className="mb-1 flex justify-between px-2 text-[10px] uppercase tracking-wide text-[var(--color-text-dim)]">
            <span>
              {t('game.visitsLeg').replace('{leg}', String(state.currentLegIndex + 1))}
            </span>
            <span>{t('game.scoreLeft')}</span>
          </div>
          <div className="flex flex-col">
            {Array.from({ length: rounds }).map((_, i) => {
              const last = i === rounds - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center py-1',
                    last && 'rounded-lg bg-[var(--color-surface-2)]',
                  )}
                >
                  <VisitCell v={visitsByPart[p0.id]?.[i]} align="right" bustLabel={t('game.bust')} />
                  <div className="w-7 shrink-0 text-center text-[10px] text-[var(--color-text-mute)]">
                    {i + 1}
                  </div>
                  <VisitCell v={visitsByPart[p1.id]?.[i]} align="left" bustLabel={t('game.bust')} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VisitCell({
  v,
  align,
  bustLabel,
}: {
  v: { effectiveScore: number; remainingAfter: number; isBust: boolean } | undefined;
  align: 'left' | 'right';
  bustLabel: string;
}) {
  return (
    <div
      className={cn('flex-1 px-2 text-sm', align === 'right' ? 'text-right' : 'text-left')}
    >
      {v ? (
        <>
          <span className={cn('font-semibold', v.isBust && 'text-[var(--color-text-dim)]')}>
            {v.isBust ? bustLabel : v.effectiveScore}
          </span>{' '}
          <span className="text-[11px] text-[var(--color-text-mute)]">
            {v.remainingAfter}
          </span>
        </>
      ) : (
        <span className="text-[var(--color-text-mute)]">·</span>
      )}
    </div>
  );
}
