import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant =
  | 'primary'
  | 'accent'
  | 'success'
  | 'ghost'
  | 'danger'
  | 'surface';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 shadow-sm',
  accent:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:brightness-90 shadow-[0_4px_20px_-6px_var(--color-accent)]',
  success:
    'bg-[var(--color-success)] text-white hover:brightness-110 active:brightness-95',
  ghost:
    'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
  danger:
    'bg-[var(--color-accent-dim)] text-white hover:bg-[var(--color-accent)]',
  surface:
    'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)]',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm rounded-lg min-h-9',
  md: 'px-4 py-2.5 text-base rounded-xl min-h-11',
  lg: 'px-6 py-3.5 text-lg rounded-xl font-semibold min-h-13',
  xl: 'px-8 py-5 text-2xl rounded-2xl font-bold min-h-16',
};

export function Button({
  variant = 'surface',
  size = 'md',
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
}
