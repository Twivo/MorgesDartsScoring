/** Promise-based confirmation dialog, available app-wide via useConfirm(). */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useT } from '@/store/LangContext';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={opts !== null}
        onClose={() => settle(false)}
        title={opts?.title}
      >
        {opts?.message && (
          <p className="mb-6 text-[var(--color-text-dim)]">{opts.message}</p>
        )}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => settle(false)}
          >
            {opts?.cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={opts?.danger ? 'accent' : 'primary'}
            size="lg"
            fullWidth
            onClick={() => settle(true)}
          >
            {opts?.confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
