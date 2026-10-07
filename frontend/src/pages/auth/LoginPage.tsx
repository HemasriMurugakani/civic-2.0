import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Phone, UserCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

import { NammaLogo } from '@/components/common/NammaLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await login(username, password);
      if (from) {
        navigate(from, { replace: true });
      } else {
        if (loggedUser.role === 'gov_admin') navigate('/governance');
        else if (loggedUser.role === 'dept_admin') navigate('/department');
        else if (loggedUser.role === 'officer') navigate('/officer');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (demoUser: string, demoRole: string) => {
    setUsername(demoUser);
    setPassword('Civic@123');
    setLoading(true);
    setError(null);
    try {
      const logged = await login(demoUser, 'Civic@123');
      if (demoRole === 'gov_admin') navigate('/governance');
      else if (demoRole === 'dept_admin') navigate('/department');
      else if (demoRole === 'officer') navigate('/officer');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center py-8 px-4 bg-[#faf9f6] dark:bg-[#141211]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center flex flex-col items-center">
          <NammaLogo size="lg" className="mb-2" />
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Tamil Nadu Citizen Grievance & Transparent Governance Platform
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Mobile Number or Email
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9800000001 or email@tngov.in"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#800000] hover:bg-[#680000] py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="text-center pt-2">
            <span className="text-xs text-stone-500">New citizen? </span>
            <Link to="/register" className="text-xs font-bold text-[#800000] hover:underline dark:text-rose-400">
              Create an account
            </Link>
          </div>
        </form>

        {/* 1-Click Quick Demo Login Shortcuts */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 text-center">
            🚀 1-Click Demo Evaluation Profiles
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => demoLogin('govadmin@tngov.in', 'gov_admin')}
              className="flex flex-col items-start p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-[#800000] transition text-left"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Gov Admin</span>
              <span className="text-[10px] text-stone-400">Full Oversight</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('admin.sanitation@tngov.in', 'dept_admin')}
              className="flex flex-col items-start p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-[#800000] transition text-left"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Dept Admin</span>
              <span className="text-[10px] text-stone-400">Sanitation KPIs</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('officer.san1@tngov.in', 'officer')}
              className="flex flex-col items-start p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-[#800000] transition text-left"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Nodal Officer</span>
              <span className="text-[10px] text-stone-400">Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('citizen1@tngov.in', 'citizen')}
              className="flex flex-col items-start p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-[#800000] transition text-left"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Citizen</span>
              <span className="text-[10px] text-stone-400">Kavitha S. (Ward 51)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
