import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  children,
  title,
  closeOnBackdrop = true,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  closeOnBackdrop?: boolean;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => closeOnBackdrop && onClose?.()}
    >
      <div
        className={cn(
          'animate-pop-in w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
