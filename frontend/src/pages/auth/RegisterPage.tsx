import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Phone, User, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NammaLogo } from '@/components/common/NammaLogo';
import { Card, Input, Button } from '@/components/ui';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        name,
        mobile,
        password,
        email: email || undefined,
        preferred_language: preferredLanguage,
        role: 'citizen',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
            Create your Citizen Account
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Submit, verify and monitor community civic grievances across Tamil Nadu
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
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kavitha Sundaram"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Mobile Number (10 digits)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <Input
                  type="tel"
                  required
                  pattern="^[6-9]\d{9}$"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9840012345"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Email Address (Optional)
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. citizen@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Password (Min 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Preferred Language / மொழி
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPreferredLanguage('en')}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition min-h-[44px] ${
                    preferredLanguage === 'en'
                      ? 'border-primary bg-primary/10 text-primary dark:text-rose-400 font-bold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredLanguage('ta')}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition min-h-[44px] font-tamil ${
                    preferredLanguage === 'ta'
                      ? 'border-primary bg-primary/10 text-primary dark:text-rose-400 font-bold'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                  }`}
                >
                  தமிழ்
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2 min-h-[44px]"
            >
              Complete Registration
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <div className="text-center pt-2">
              <span className="text-xs text-stone-500">Already registered? </span>
              <Link to="/login" className="text-xs font-bold text-primary hover:underline dark:text-rose-400">
                Sign In
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
