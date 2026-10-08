import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, Award, HelpCircle,
  Download, ExternalLink, ChevronRight, Sparkles, AlertCircle, RefreshCw,
  Send, ShieldCheck, Check, X
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { LearningModuleDetail, QuizSubmissionResult } from '@/lib/types';
import {
  PageHeader, Breadcrumbs, Card, CardHeader, CardTitle, CardContent, Button, Badge
} from '@/components/ui';

export const ModuleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [module, setModule] = useState<LearningModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Active step: index 0..N-1 is lesson index; -1 indicates Final Quiz
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completingLesson, setCompletingLesson] = useState(false);

  // Quiz submission state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);

  const fetchModule = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await api.getEducationModule(slug);
      setModule(data);

      // Auto-resume where user left off
      if (data.current_lesson_order > 1 && data.current_lesson_order <= data.lessons.length) {
        setActiveStep(data.current_lesson_order - 1);
      } else if (data.current_lesson_order > data.lessons.length) {
        // All lessons done -> set to quiz
        setActiveStep(-1);
      }
    } catch (err: any) {
      toast.error('Failed to load module: ' + (err.message || 'Not found'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModule();
  }, [slug]);

  const handleCompleteLesson = async (lessonId: number) => {
    if (!module) return;
    if (!user) {
      toast.error('Please log in to track your learning progress');
      navigate('/login');
      return;
    }
    try {
      setCompletingLesson(true);
      const res = await api.completeLesson(module.id, lessonId);
      toast.success('Lesson completed! Progress saved.');

      // Update local state
      setModule((prev) =>
        prev
          ? {
              ...prev,
              completed_lesson_ids: res.completed_lesson_ids,
              user_progress_percent: res.progress_percent,
              current_lesson_order: res.current_lesson_order,
            }
          : null
      );

      // Advance to next lesson or quiz
      if (activeStep < module.lessons.length - 1) {
        setActiveStep(activeStep + 1);
      } else {
        setActiveStep(-1); // Move to quiz
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lesson');
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleSelectAnswer = (questionId: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;
    if (!user) {
      toast.error('Please log in to submit evaluation');
      navigate('/login');
      return;
    }

    if (Object.keys(selectedAnswers).length < module.quiz_questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    try {
      setSubmittingQuiz(true);
      const result = await api.submitQuiz(module.id, selectedAnswers);
      setQuizResult(result);

      if (result.passed) {
        toast.success(
          `Congratulations! You passed with ${result.score}% and earned +${result.points_awarded + result.bonus_awarded} civic points!`,
          { duration: 5000 }
        );
      } else {
        toast.error(`You scored ${result.score}%. A score of 70% is required to earn the certificate. Review explanations and try again!`);
      }
      fetchModule();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#800000] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-stone-500 font-semibold">Loading curriculum & lesson reader...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center my-auto space-y-4 font-sans">
        <h2 className="text-xl font-bold">Course Not Found</h2>
        <p className="text-xs text-stone-500">The requested learning curriculum does not exist.</p>
        <Link
          to="/education"
          className="inline-flex px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000]"
        >
          Back to Academy
        </Link>
      </div>
    );
  }

  const currentLesson = activeStep >= 0 && activeStep < module.lessons.length ? module.lessons[activeStep] : null;
  const isCurrentLessonCompleted = currentLesson ? module.completed_lesson_ids.includes(currentLesson.id) : false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
        <Link
          to="/education"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Courses</span>
        </Link>

        {/* Course Banner */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-2xs mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full uppercase tracking-wider text-[10px]">
                {module.difficulty}
              </span>
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{module.duration_minutes} Minutes</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-xl flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+{module.points} Pts (+{module.bonus_points} Bonus)</span>
              </span>
              {module.has_certificate && module.certificate_code && (
                <a
                  href={api.getCertificatePdfUrl(module.certificate_code)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Certificate</span>
                </a>
              )}
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white">
            {module.title}
          </h1>

          <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl">
            {module.summary}
          </p>

          {/* Progress bar */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex justify-between text-xs font-semibold text-stone-500 mb-1.5">
              <span>Overall Course Completion</span>
              <span>{module.user_progress_percent}%</span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#800000] h-full rounded-full transition-all duration-300"
                style={{ width: `${module.user_progress_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Curriculum Navigator */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 px-2">
                Curriculum Syllabus
              </h2>

              <div className="space-y-1.5">
                {module.lessons.map((lesson, idx) => {
                  const isCompleted = module.completed_lesson_ids.includes(lesson.id);
                  const isCurrent = activeStep === idx;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveStep(idx)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-[#800000] text-white shadow-xs font-bold'
                          : isCompleted
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 text-stone-800 dark:text-stone-200 hover:bg-emerald-100/60'
                          : 'bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                          isCurrent
                            ? 'bg-white text-[#800000]'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>
                        <span className="truncate">{lesson.title}</span>
                      </div>

                      <span className="text-[10px] shrink-0 opacity-75">{lesson.duration_minutes}m</span>
                    </button>
                  );
                })}

                {/* Final Step: Quiz */}
                <button
                  onClick={() => setActiveStep(-1)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition flex items-center justify-between gap-3 ${
                    activeStep === -1
                      ? 'bg-[#800000] text-white shadow-xs font-bold'
                      : module.passed
                      ? 'bg-amber-50 dark:bg-amber-950/20 text-stone-800 dark:text-stone-200'
                      : 'bg-stone-50 dark:bg-stone-800/40 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                      activeStep === -1
                        ? 'bg-white text-[#800000]'
                        : module.passed
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-700'
                    }`}>
                      ★
                    </span>
                    <span className="truncate">Final Assessment & Quiz</span>
                  </div>

                  {module.passed && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Passed</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Lesson Reader OR Final Quiz */}
          <div className="lg:col-span-8">
            {activeStep >= 0 && currentLesson ? (
              /* LESSON READER */
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Lesson {activeStep + 1} of {module.lessons.length}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white mt-1">
                      {currentLesson.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{currentLesson.duration_minutes} Mins</span>
                  </div>
                </div>

                {/* Lesson Markdown Content */}
                <div className="prose dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                  {currentLesson.content_markdown}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => handleCompleteLesson(currentLesson.id)}
                    disabled={completingLesson}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition shadow-xs disabled:opacity-50"
                  >
                    {completingLesson ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isCurrentLessonCompleted ? 'Next Step' : 'Mark Complete & Continue'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* FINAL QUIZ ASSESSMENT */
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 md:p-8 shadow-2xs space-y-6">
                <div className="border-b border-stone-100 dark:border-stone-800 pb-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    Official State Evaluation
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white">
                    Final Knowledge Assessment
                  </h2>
                  <p className="text-xs text-stone-500">
                    A passing score of <strong>70% or higher</strong> unlocks your verified Government of Tamil Nadu Certificate and awards <strong>+{module.points} Civic Points</strong> (plus <strong>+{module.bonus_points}</strong> for 100% accuracy).
                  </p>
                </div>

                {/* Score Celebration Banner if already submitted */}
                {quizResult && (
                  <div className={`p-6 rounded-2xl border-2 space-y-3 ${
                    quizResult.passed
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500/40 text-rose-900 dark:text-rose-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {quizResult.passed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-rose-600" />
                        )}
                        <div>
                          <h3 className="font-bold text-base">
                            {quizResult.passed ? 'Assessment Passed Successfully! 🎉' : 'Assessment Incomplete'}
                          </h3>
                          <p className="text-xs opacity-80">
                            Score: <strong>{quizResult.score}%</strong> ({quizResult.correct_count} of {quizResult.total_questions} correct)
                          </p>
                        </div>
                      </div>

                      {quizResult.passed && quizResult.certificate_code && (
                        <a
                          href={api.getCertificatePdfUrl(quizResult.certificate_code)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Certificate</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Quiz Questions Form */}
                <form onSubmit={handleSubmitQuiz} className="space-y-6">
                  {module.quiz_questions.map((q, qIdx) => {
                    const review = quizResult?.question_reviews.find((r) => r.question_id === q.id);

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition space-y-3 ${
                          review
                            ? review.is_correct
                              ? 'border-emerald-400 bg-emerald-50/20'
                              : 'border-rose-400 bg-rose-50/20'
                            : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs md:text-sm text-stone-900 dark:text-white">
                            {qIdx + 1}. {q.question}
                          </h4>
                          {review && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              review.is_correct
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {review.is_correct ? 'Correct ✓' : 'Incorrect ✗'}
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[q.id] === optIdx;
                            const isCorrectAnswer = review?.correct_option_index === optIdx;

                            return (
                              <label
                                key={optIdx}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                                  review
                                    ? isCorrectAnswer
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                                      : isSelected
                                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60'
                                      : 'border-stone-200 dark:border-stone-700 opacity-60'
                                    : isSelected
                                    ? 'border-[#800000] bg-rose-50 dark:bg-rose-950/40 text-[#800000] dark:text-rose-300 font-semibold'
                                    : 'border-stone-200 dark:border-stone-700 hover:bg-white dark:hover:bg-stone-800'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${q.id}`}
                                  value={optIdx}
                                  checked={isSelected}
                                  disabled={submittingQuiz}
                                  onChange={() => handleSelectAnswer(q.id, optIdx)}
                                  className="accent-[#800000]"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Official Explanation if reviewed */}
                        {review && (
                          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 mt-2">
                            <strong>Explanation:</strong> {review.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-xs text-stone-400">
                      Answered: {Object.keys(selectedAnswers).length} of {module.quiz_questions.length}
                    </span>

                    <button
                      type="submit"
                      disabled={submittingQuiz || Object.keys(selectedAnswers).length < module.quiz_questions.length}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition shadow-xs disabled:opacity-40"
                    >
                      {submittingQuiz ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Assessment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};
