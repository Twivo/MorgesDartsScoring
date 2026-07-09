import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { minDartsToCheckout } from '@/domain/rules/checkout';
import { useT } from '@/store/LangContext';

/**
 * Shown when the entered score finishes the leg (remaining hits 0).
 * Confirms the checkout and records how many darts were used on the
 * final visit (1-3). Cancel discards the visit entirely.
 *
 * Dart counts that are physically impossible for this finish are disabled:
 * e.g. 102 can only be checked out in 3 darts, so 1 and 2 are greyed out.
 */
export function LegEndModal({
  open,
  playerName,
  legNumber,
  checkoutScore,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  playerName: string;
  legNumber: number;
  /** The score that was closed (what the player was sitting on). */
  checkoutScore: number;
  onConfirm: (darts: number) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const minDarts = minDartsToCheckout(checkoutScore) ?? 1;

  return (
    <Modal open={open} onClose={onCancel} closeOnBackdrop={false}>
      <div className="text-center">
        <div className="mb-1 text-5xl">🎯</div>
        <h2 className="text-2xl font-black">
          {t('game.legComplete').replace('{leg}', String(legNumber))}
        </h2>
        <p className="mt-1 text-[var(--color-accent)]">
          {t('game.checkedOut')
            .replace('{player}', playerName)
            .replace('{score}', String(checkoutScore))}
        </p>

        <p className="mt-5 mb-2 text-sm text-[var(--color-text-dim)]">
          {t('game.finalDartsQuestion')}
        </p>
        <div className="flex gap-2">
          {[1, 2, 3].map((d) => {
            const impossible = d < minDarts;
            return (
              <Button
                key={d}
                variant="success"
                size="xl"
                fullWidth
                disabled={impossible}
                title={
                  impossible
                    ? t('game.cannotCheckoutInDarts')
                        .replace('{score}', String(checkoutScore))
                        .replace('{darts}', String(d))
                        .replace(
                          '{unit}',
                          d > 1 ? t('game.darts') : t('game.dartSingular'),
                        )
                    : undefined
                }
                onClick={() => onConfirm(d)}
              >
                {d}
              </Button>
            );
          })}
        </div>
        {minDarts > 1 && (
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            {t('game.needsDarts')
              .replace('{score}', String(checkoutScore))
              .replace('{darts}', String(minDarts))}
          </p>
        )}

        <Button
          variant="ghost"
          size="md"
          fullWidth
          className="mt-3"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </Modal>
  );
}
