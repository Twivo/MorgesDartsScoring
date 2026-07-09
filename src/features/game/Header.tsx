import { useGame } from '@/store/GameContext';
import { participantLabel, playerName } from '@/domain/presentation';
import { cn } from '@/lib/cn';
import { useT } from '@/store/LangContext';

export function Header() {
  const { config, state, saveStatus } = useGame();
  const { t } = useT();
  const { activeParticipantId, activePlayerId, legStarterId } = state;

  const isDouble = config.mode === 'DOUBLE';
  const legNumber = state.currentLegIndex + 1;
  const starterName = isDouble
    ? participantLabel(config, legStarterId)
    : playerName(
        config,
        config.participants.find((p) => p.id === legStarterId)?.playerIds[0] ??
          '',
      );

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs">
      <div
        key={activePlayerId}
        className="animate-player-switch flex items-baseline gap-1.5 truncate"
      >
        <span className="text-base font-black">
          {playerName(config, activePlayerId)}
        </span>
        {isDouble && (
          <span className="rounded bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {participantLabel(config, activeParticipantId)}
          </span>
        )}
        <span className="text-[var(--color-text-dim)]">{t('game.toThrowSuffix')}</span>
      </div>

      {saveStatus !== 'saved' && (
        <span
          className={cn(
            'mr-2 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
            saveStatus === 'offline'
              ? 'text-[var(--color-warning)]'
              : 'text-[var(--color-text-dim)]',
          )}
          title={
            saveStatus === 'offline'
              ? t('game.offlineTitle')
              : t('game.savingTitle')
          }
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              saveStatus === 'offline'
                ? 'bg-[var(--color-warning)]'
                : 'animate-pulse bg-[var(--color-accent)]',
            )}
          />
          {saveStatus === 'offline' ? t('game.offlineRetrying') : t('common.saving')}
        </span>
      )}

      <div className="shrink-0 text-right text-[var(--color-text-dim)]">
        <span className="font-semibold text-[var(--color-accent)]">
          {t('game.leg')} {legNumber}
        </span>{' '}
        · {t('game.starts').replace('{starter}', starterName)}
        <span className="ml-1 hidden sm:inline">
          · {t('game.shortInfo')
            .replace('{variant}', String(config.variant))
            .replace('{legs}', String(config.legsToWin))}
        </span>
      </div>
    </header>
  );
}
