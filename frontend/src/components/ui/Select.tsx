import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full min-h-[44px] appearance-none rounded-xl border bg-white dark:bg-stone-900/90 pl-3.5 pr-10 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 transition-colors',
              'border-stone-300 dark:border-stone-700 focus:border-[#800000] dark:focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-[#800000]/20 dark:focus:ring-rose-500/20',
              'disabled:cursor-not-allowed disabled:bg-stone-100 dark:disabled:bg-stone-800 disabled:opacity-60',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-stone-400 dark:text-stone-500" />
        </div>
        {error && (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
