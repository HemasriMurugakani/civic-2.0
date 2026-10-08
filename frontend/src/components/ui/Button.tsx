import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#800000] hover:bg-[#680000] text-white shadow-xs dark:bg-rose-600 dark:hover:bg-rose-500',
        primary:
          'bg-[#800000] hover:bg-[#680000] text-white shadow-xs dark:bg-rose-600 dark:hover:bg-rose-500',
        secondary:
          'bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-750 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700/60',
        outline:
          'border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 shadow-2xs',
        ghost:
          'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
        destructive:
          'bg-rose-600 hover:bg-rose-700 text-white shadow-xs dark:bg-rose-700 dark:hover:bg-rose-600',
        link:
          'text-[#800000] dark:text-rose-400 hover:underline p-0 h-auto font-medium',
      },
      size: {
        sm: 'h-9 px-3 text-xs rounded-lg min-h-[36px]',
        md: 'h-10 px-4 text-xs sm:text-sm rounded-xl min-h-[44px]',
        lg: 'h-12 px-6 text-sm sm:text-base rounded-xl min-h-[48px]',
        icon: 'h-10 w-10 p-0 rounded-xl min-h-[44px] min-w-[44px] shrink-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loading?: boolean;
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      loading = false,
      asChild = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading;
    const buttonClasses = cn(buttonVariants({ variant, size, fullWidth, className }));

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(buttonClasses, (children.props as any)?.className),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={buttonClasses}
        {...props}
      >
        {isBusy && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {!isBusy && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {!isBusy && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
