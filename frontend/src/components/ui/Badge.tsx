import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-semibold rounded-full border transition-colors select-none',
  {
    variants: {
      variant: {
        default:
          'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-700',
        primary:
          'bg-rose-50 dark:bg-rose-950/60 text-[#800000] dark:text-rose-300 border-rose-200 dark:border-rose-900',
        secondary:
          'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700',
        success:
          'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        warning:
          'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        danger:
          'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        destructive:
          'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        info:
          'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        outline:
          'bg-transparent text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700',
        neutral:
          'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-700',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px] leading-tight',
        md: 'px-2.5 py-1 text-xs leading-normal',
        lg: 'px-3 py-1.5 text-xs sm:text-sm leading-normal',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  dot = false,
  pulse = false,
  children,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current shrink-0',
            pulse && 'animate-pulse'
          )}
        />
      )}
      <span className="truncate max-w-[200px] sm:max-w-none">{children}</span>
    </span>
  );
};
