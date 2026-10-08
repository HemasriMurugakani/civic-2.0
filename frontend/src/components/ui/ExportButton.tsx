import React, { useState } from 'react';
import { Download, ChevronDown, FileText, Database } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface ExportButtonProps {
  onExportCsv?: () => void | Promise<void>;
  onExportJson?: () => void | Promise<void>;
  data?: any[];
  filename?: string;
  title?: string;
  label?: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportCsv,
  onExportJson,
  data,
  filename = 'export',
  title,
  label = 'Export',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const defaultExportCsv = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const defaultExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAction = async (action?: () => void | Promise<void>, fallback?: () => void) => {
    setIsExporting(true);
    setOpen(false);
    try {
      if (action) await action();
      else if (fallback) fallback();
    } finally {
      setIsExporting(false);
    }
  };

  const effectiveLabel = title || label;

  // If only one export format is provided, render single button
  if (onExportCsv && !onExportJson) {
    return (
      <Button
        variant="outline"
        size="sm"
        isLoading={isExporting}
        leftIcon={<Download className="h-4 w-4" />}
        onClick={() => handleAction(onExportCsv)}
        className={className}
      >
        {label} CSV
      </Button>
    );
  }

  return (
    <div className={cn('relative inline-block text-left font-sans', className)}>
      <Button
        variant="outline"
        size="sm"
        isLoading={isExporting}
        leftIcon={<Download className="h-4 w-4" />}
        rightIcon={<ChevronDown className="h-3.5 w-3.5 opacity-60" />}
        onClick={() => setOpen(!open)}
      >
        {effectiveLabel}
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl z-30 p-1.5 animate-in fade-in"
          onMouseLeave={() => setOpen(false)}
        >
          {(onExportCsv || data) && (
            <button
              type="button"
              onClick={() => handleAction(onExportCsv, defaultExportCsv)}
              className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export as CSV</span>
            </button>
          )}
          {(onExportJson || data) && (
            <button
              type="button"
              onClick={() => handleAction(onExportJson, defaultExportJson)}
              className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Export as JSON</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
