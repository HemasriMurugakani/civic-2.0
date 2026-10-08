import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised' | 'overlay';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = 'raised', interactive = false, ...props }, ref) => {
    const elevationClasses = {
      flat: 'border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-none',
      raised:
        'border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs dark:shadow-none',
      overlay:
        'border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl dark:shadow-black/40',
    }[elevation];

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-150',
          elevationClasses,
          interactive &&
            'hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-5 sm:p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs sm:text-sm text-stone-500 dark:text-stone-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 sm:p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-5 sm:p-6 pt-0 border-t border-stone-100 dark:border-stone-800/80 mt-4', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
