import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Phone, UserCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NammaLogo } from '@/components/common/NammaLogo';
import { Card, Input, Button } from '@/components/ui';

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
    <div className="flex min-h-[85vh] items-center justify-center py-10 px-4 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center flex flex-col items-center">
          <NammaLogo size="lg" className="mb-2" />
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Sign in to your account
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Tamil Nadu Citizen Grievance & Transparent Governance Platform
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card className="p-6 sm:p-8 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 9800000001 or email@tngov.in"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2 min-h-[44px]"
            >
              Sign In
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <div className="text-center pt-2">
              <span className="text-xs text-stone-500">New citizen? </span>
              <Link to="/register" className="text-xs font-bold text-primary hover:underline dark:text-rose-400">
                Create an account
              </Link>
            </div>
          </form>
        </Card>

        {/* 1-Click Quick Demo Login Shortcuts */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2.5 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Demo Evaluation Profiles
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => demoLogin('govadmin@tngov.in', 'gov_admin')}
              className="flex flex-col items-start p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-primary transition text-left min-h-[44px]"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Gov Admin</span>
              <span className="text-[10px] text-stone-400">Full Oversight</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('admin.sanitation@tngov.in', 'dept_admin')}
              className="flex flex-col items-start p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-primary transition text-left min-h-[44px]"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Dept Admin</span>
              <span className="text-[10px] text-stone-400">Sanitation KPIs</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('officer.san1@tngov.in', 'officer')}
              className="flex flex-col items-start p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-primary transition text-left min-h-[44px]"
            >
              <span className="font-bold text-stone-900 dark:text-white text-[11px]">Nodal Officer</span>
              <span className="text-[10px] text-stone-400">Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('citizen1@tngov.in', 'citizen')}
              className="flex flex-col items-start p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 hover:border-primary transition text-left min-h-[44px]"
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
