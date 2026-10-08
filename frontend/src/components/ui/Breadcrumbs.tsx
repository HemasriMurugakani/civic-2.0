import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHome = true,
  className,
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center overflow-x-auto py-2 text-xs font-sans', className)}
    >
      <ol className="flex items-center gap-1.5 whitespace-nowrap">
        {showHome && (
          <li>
            <Link
              to="/"
              className="flex items-center text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition"
              title="Home"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {(showHome || index > 0) && (
                <li className="text-stone-400 dark:text-stone-600 select-none">
                  <ChevronRight className="h-3 w-3" />
                </li>
              )}
              <li className="flex items-center">
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[200px]"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition truncate max-w-[150px]"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
