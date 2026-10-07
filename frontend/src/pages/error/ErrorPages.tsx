import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ShieldAlert, WifiOff, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 dark:bg-stone-800 text-stone-500 shadow-2xs">
      <AlertCircle className="h-8 w-8" />
    </div>
    <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">404 - Page Not Found</h1>
    <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
      The municipal record, grievance, or portal resource you requested does not exist or has moved.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-xl bg-[#800000] hover:bg-[#680000] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition"
    >
      <Home className="h-4 w-4" />
      <span>Return Home</span>
    </Link>
  </div>
);

export const ForbiddenPage: React.FC = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shadow-2xs">
      <ShieldAlert className="h-8 w-8" />
    </div>
    <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">403 - Access Forbidden</h1>
    <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
      Department security scoping restricts this section to authorized administrative personnel.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-xl bg-[#800000] hover:bg-[#680000] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition"
    >
      <Home className="h-4 w-4" />
      <span>Return to Dashboard</span>
    </Link>
  </div>
);

export const OfflinePage: React.FC = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shadow-2xs">
      <WifiOff className="h-8 w-8" />
    </div>
    <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">Connection Offline</h1>
    <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
      Your draft has been preserved in local memory. You can resume filing as soon as network returns.
    </p>
  </div>
);
