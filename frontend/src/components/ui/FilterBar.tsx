import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Badge } from './Badge';

export interface FilterBarProps {
  searchQuery?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  totalResults?: number;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  children,
  actions,
  onClearFilters,
  hasActiveFilters = false,
  totalResults,
  className,
}) => {
  const currentQuery = searchQuery !== undefined ? searchQuery : searchValue;
  const filterElements = filters || children;
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs font-sans',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {onSearchChange && (
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              value={currentQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-h-[40px] rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 pl-10 pr-9 py-2 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-[#800000] dark:focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-[#800000]/20 dark:focus:ring-rose-500/20"
            />
            {currentQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
          {totalResults !== undefined && (
            <Badge variant="secondary" size="md">
              {totalResults.toLocaleString()} results
            </Badge>
          )}

          {hasActiveFilters && onClearFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              leftIcon={<X className="h-3.5 w-3.5" />}
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400"
            >
              Clear filters
            </Button>
          )}

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {filterElements && (
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters:</span>
          </div>
          {filterElements}
        </div>
      )}
    </div>
  );
};
