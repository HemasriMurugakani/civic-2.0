import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Award, Trophy, CheckCircle2,
  Clock, ArrowRight, Download, ExternalLink, BarChart3,
  Search, ShieldCheck, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  LearningModuleItem, CertificateItem, LearningLeaderboardEntry,
  EducationAnalytics, ModuleDifficulty
} from '@/lib/types';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Badge
} from '@/components/ui';

export const EducationHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const currentTab = searchParams.get('tab') || 'modules';
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [modules, setModules] = useState<LearningModuleItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LearningLeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<EducationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const params: { difficulty?: string } = {};
      if (difficultyFilter !== 'all') {
        params.difficulty = difficultyFilter;
      }
      const data = await api.getEducationModules(params);
      setModules(data);
    } catch (err: any) {
      toast.error('Failed to load courses: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    if (!user) return;
    try {
      const data = await api.getMyCertificates();
      setCertificates(data);
    } catch (err) {
      // Ignored if not logged in
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLearningLeaderboard(20);
      setLeaderboard(data);
    } catch (err) {
      // Ignored
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await api.getEducationAnalytics();
      setAnalytics(data);
    } catch (err) {
      // Ignored
    }
  };

  useEffect(() => {
    fetchModules();
  }, [difficultyFilter]);

  useEffect(() => {
    if (currentTab === 'certificates') {
      fetchCertificates();
    } else if (currentTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (currentTab === 'analytics') {
      fetchAnalytics();
    }
  }, [currentTab, user]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Filter modules by search
  const filteredModules = modules.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute citizen summary
  const completedCount = modules.filter((m) => m.passed || m.user_status === 'completed').length;
  const inProgressCount = modules.filter((m) => m.user_status === 'in_progress').length;
  const earnedCertsCount = modules.filter((m) => m.has_certificate).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#800000] via-[#5c0000] to-[#360000] rounded-3xl p-6 md:p-10 text-white shadow-xl mb-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-rose-200">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Government of Tamil Nadu Civic Knowledge Initiative</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
              Civic Competence & Governance Academy
            </h1>

            <p className="text-xs md:text-sm text-stone-200 leading-relaxed">
              Master Tamil Nadu's municipal structures, the RTI Act, Ward Area Sabhas, and budget transparency.
              Earn official state-accredited certificates and civic points!
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-rose-200 font-medium">Available Courses</div>
              <div className="text-xl md:text-2xl font-black mt-0.5">{modules.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-rose-200 font-medium">Your Completed</div>
              <div className="text-xl md:text-2xl font-black mt-0.5 text-emerald-300">
                {user ? completedCount : '—'}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-rose-200 font-medium">In Progress</div>
              <div className="text-xl md:text-2xl font-black mt-0.5 text-amber-300">
                {user ? inProgressCount : '—'}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[11px] text-rose-200 font-medium">Earned Certificates</div>
              <div className="text-xl md:text-2xl font-black mt-0.5 text-yellow-300">
                {user ? earnedCertsCount : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-stone-200 dark:border-stone-800 pb-3 mb-6">
          <button
            onClick={() => setTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              currentTab === 'modules'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 border border-stone-200 dark:border-stone-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Courses & Modules</span>
          </button>

          <button
            onClick={() => setTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              currentTab === 'certificates'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 border border-stone-200 dark:border-stone-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>My Certificates</span>
            {earnedCertsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-900 text-[10px] font-black">
                {earnedCertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              currentTab === 'leaderboard'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 border border-stone-200 dark:border-stone-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Learning Leaderboard</span>
          </button>

          <button
            onClick={() => setTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              currentTab === 'analytics'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 border border-stone-200 dark:border-stone-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Civic Literacy KPIs</span>
          </button>
        </div>

        {/* TAB 1: MODULES CATALOG */}
        {currentTab === 'modules' && (
          <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search courses or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-xs font-bold text-stone-500 whitespace-nowrap flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Difficulty:
                </span>
                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficultyFilter(lvl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                      difficultyFilter === lvl
                        ? 'bg-[#800000] text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Grid */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-stone-500 font-semibold">Loading civic modules...</p>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center text-stone-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No modules match your filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredModules.map((module) => {
                  const difficultyColor =
                    module.difficulty === 'beginner'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : module.difficulty === 'intermediate'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';

                  const isCompleted = module.passed || module.user_status === 'completed';

                  return (
                    <div
                      key={module.id}
                      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${difficultyColor}`}>
                            {module.difficulty}
                          </span>

                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3" />
                            <span>+{module.points} pts</span>
                          </div>
                        </div>

                        <h3 className="font-bold text-base text-stone-900 dark:text-white leading-snug">
                          {module.title}
                        </h3>

                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3">
                          {module.summary}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{module.duration_minutes} mins</span>
                          </span>
                          <span>&bull;</span>
                          <span>{module.lessons_count} lessons</span>
                          <span>&bull;</span>
                          <span>{module.quiz_questions_count} quiz Qs</span>
                        </div>
                      </div>

                      {/* Progress / Status Bottom */}
                      <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                        {user && module.user_progress_percent > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold text-stone-500">
                              <span>Progress</span>
                              <span>{module.user_progress_percent}%</span>
                            </div>
                            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#800000] h-full rounded-full transition-all duration-300"
                                style={{ width: `${module.user_progress_percent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">
                              {module.user_status === 'in_progress' ? 'In progress' : 'Not started'}
                            </span>
                          )}

                          <Link
                            to={`/education/modules/${module.slug}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition shadow-xs"
                          >
                            <span>{isCompleted ? 'Review' : 'Start Course'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY CERTIFICATES */}
        {currentTab === 'certificates' && (
          <div className="space-y-6">
            {!user ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center space-y-3">
                <Award className="w-12 h-12 mx-auto text-amber-500 opacity-80" />
                <h3 className="font-bold text-base">Sign In to View Your Earned Credentials</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Earn accredited state certificates with unique verification IDs by completing civic modules.
                </p>
                <Link
                  to="/login"
                  className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000]"
                >
                  Sign In
                </Link>
              </div>
            ) : certificates.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center text-stone-400 space-y-3">
                <Award className="w-12 h-12 mx-auto opacity-40 text-stone-400" />
                <h3 className="font-bold text-base text-stone-700 dark:text-stone-300">No Certificates Earned Yet</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Pass any module quiz with 70% or higher to unlock an official Government of Tamil Nadu Certificate!
                </p>
                <button
                  onClick={() => setTab('modules')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000]"
                >
                  Browse Modules
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-white dark:bg-stone-900 border-2 border-amber-500/30 dark:border-amber-500/20 rounded-2xl p-6 shadow-2xs space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                          Official Credential
                        </span>
                        <h3 className="font-bold text-base text-stone-900 dark:text-white mt-1">
                          {cert.title}
                        </h3>
                        <p className="text-xs text-stone-400">Awarded to {cert.user_name}</p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-800 space-y-1 text-xs">
                      <div className="flex justify-between text-stone-500">
                        <span>Evaluation Score:</span>
                        <span className="font-bold text-emerald-600">{cert.score}%</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Issued On:</span>
                        <span>{new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Verification ID:</span>
                        <span className="font-mono font-bold text-[#800000] dark:text-rose-400">{cert.certificate_code}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <a
                        href={api.getCertificatePdfUrl(cert.certificate_code)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>

                      <Link
                        to={`/verify/${cert.certificate_code}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Public Verify</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEARNING LEADERBOARD */}
        {currentTab === 'leaderboard' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Civic Literacy Champions</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Ranked by certified governance modules completed and civic learning points earned.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Learner</th>
                    <th className="py-3 px-3 text-center">Modules Passed</th>
                    <th className="py-3 px-3 text-center">Certificates</th>
                    <th className="py-3 px-3 text-right">Learning Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboard.map((entry) => (
                    <tr key={entry.public_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="py-3.5 px-3 font-bold text-stone-900 dark:text-white">
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span>{entry.display_name}</span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                            Lvl {entry.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">{entry.public_id}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-stone-700 dark:text-stone-300">
                        {entry.modules_completed}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-amber-600">
                        {entry.certificates_count} 🎓
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-[#800000] dark:text-rose-400">
                        +{entry.total_learning_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CIVIC LITERACY KPIS */}
        {currentTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-stone-400 font-semibold">Total Enrollments</div>
                <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">{analytics.total_enrollments}</div>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-stone-400 font-semibold">Total Completions</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{analytics.total_completions}</div>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-stone-400 font-semibold">Completion Rate</div>
                <div className="text-2xl font-black text-[#800000] dark:text-rose-400 mt-1">{analytics.overall_completion_rate}%</div>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-stone-400 font-semibold">Certificates Issued</div>
                <div className="text-2xl font-black text-amber-500 mt-1">{analytics.total_certificates_issued}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs">
              <h3 className="font-bold text-base text-stone-900 dark:text-white mb-4">Module-Wise Performance Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 text-[10px] uppercase font-bold">
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3 text-center">Enrollments</th>
                      <th className="py-2.5 px-3 text-center">Completions</th>
                      <th className="py-2.5 px-3 text-center">Pass Rate</th>
                      <th className="py-2.5 px-3 text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {analytics.module_metrics.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                        <td className="py-3 px-3 font-bold text-stone-900 dark:text-white">{m.title}</td>
                        <td className="py-3 px-3 text-center text-stone-600 dark:text-stone-300">{m.enrollments}</td>
                        <td className="py-3 px-3 text-center text-emerald-600 font-semibold">{m.completions}</td>
                        <td className="py-3 px-3 text-center">{m.completion_rate}%</td>
                        <td className="py-3 px-3 text-right font-bold text-[#800000] dark:text-rose-400">{m.avg_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
