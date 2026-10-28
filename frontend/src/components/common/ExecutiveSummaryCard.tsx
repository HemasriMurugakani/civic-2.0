import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, AlertCircle, Clock, User, Building2,
  MapPin, Copy, Check, RefreshCw, ChevronRight, FileText, Globe2
} from 'lucide-react';
import { api, ExecutiveSummaryResponse } from '@/lib/api';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { toast } from 'sonner';

interface ExecutiveSummaryCardProps {
  complaintId: number | string;
  isPublic?: boolean;
  className?: string;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  complaintId,
  isPublic = false,
  className = '',
}) => {
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [data, setData] = useState<ExecutiveSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchSummary = async (lang: 'en' | 'ta') => {
    if (!complaintId) return;
    setLoading(true);
    try {
      let res: ExecutiveSummaryResponse;
      if (isPublic) {
        res = await api.getExecutiveSummary(complaintId, lang);
      } else {
        const idNum = typeof complaintId === 'number' ? complaintId : parseInt(complaintId, 10);
        res = !isNaN(idNum) ? await api.getComplaintSummary(idNum, lang) : await api.getExecutiveSummary(complaintId, lang);
      }
      setData(res);
    } catch (err: any) {
      console.warn('Could not fetch executive summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(language);
  }, [complaintId, language]);

  const handleCopy = () => {
    if (!data) return;
    const textToCopy = `🏛️ NammaNagar Executive Brief [${data.reference_no || complaintId}]\n\n` +
      `Headline: ${data.headline}\n\n` +
      `Executive Summary (2-Sentence):\n${data.summary}\n\n` +
      `Action Items:\n${data.action_items.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n` +
      `Department: ${data.key_entities.department || 'N/A'} | Ward: ${data.key_entities.ward || 'N/A'} | Status: ${data.key_entities.status || 'N/A'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Executive briefing copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Split summary into two sentences for highlighted visualization
  const sentences = data?.summary
    ? data.summary.split(/(?<=[.!?])\s+/).filter(Boolean)
    : [];

  return (
    <Card className={`overflow-hidden border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/40 via-white to-stone-50 dark:from-stone-900 dark:via-stone-900/90 dark:to-stone-950 p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-amber-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                Executive AI Brief
                <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Ministers & Admins
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              2-sentence operational synthesis & actionable next steps
            </p>
          </div>
        </div>

        {/* Right controls: Language toggle, copy, refresh */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                language === 'en'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                language === 'ta'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              தமிழ்
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!data || loading}
            className="h-7 px-2 text-xs"
            leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          >
            {copied ? 'Copied' : 'Brief'}
          </Button>

          <button
            type="button"
            onClick={() => fetchSummary(language)}
            disabled={loading}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Refresh AI Summary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="py-4 space-y-3">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        </div>
      ) : data ? (
        <div className="pt-4 space-y-4">
          {/* 2-Sentence Core Summary Callout */}
          <div className="rounded-xl bg-white dark:bg-stone-950/80 border border-amber-200/90 dark:border-amber-900/40 p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {language === 'ta' ? 'அதிகாரப்பூர்வ 2-வாக்கிய சுருக்கம்' : '2-Sentence Executive Synthesis'}
              </span>
              <span className="font-mono text-[10px] text-stone-400">
                {data.model_name}
              </span>
            </div>

            {sentences.length >= 2 ? (
              <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <p>
                    <strong className="text-stone-900 dark:text-white font-semibold">
                      {language === 'ta' ? 'சிக்கலின் தன்மை & இடம்: ' : 'Problem & Location: '}
                    </strong>
                    {sentences[0]}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <p>
                    <strong className="text-stone-900 dark:text-white font-semibold">
                      {language === 'ta' ? 'நடப்பு களநிலை & நடவடிக்கை: ' : 'Operational Status & Action: '}
                    </strong>
                    {sentences.slice(1).join(' ')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                {data.summary}
              </p>
            )}
          </div>

          {/* Actionable Next Steps */}
          {data.action_items && data.action_items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                {language === 'ta' ? 'உடனடி கள நடவடிக்கைகள்' : 'Actionable Next Steps'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.action_items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-800 p-2.5 text-xs text-stone-700 dark:text-stone-300"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Entities Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
            <div className="rounded-md bg-stone-100/60 dark:bg-stone-800/40 p-2">
              <span className="text-stone-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Dept
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block" title={data.key_entities.department}>
                {data.key_entities.department || 'Public Works'}
              </span>
            </div>

            <div className="rounded-md bg-stone-100/60 dark:bg-stone-800/40 p-2">
              <span className="text-stone-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ward
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block">
                {data.key_entities.ward || 'Ward Zone'}
              </span>
            </div>

            <div className="rounded-md bg-stone-100/60 dark:bg-stone-800/40 p-2">
              <span className="text-stone-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" /> SLA Health
              </span>
              <span className={`font-semibold capitalize truncate block ${
                data.key_entities.sla_status === 'breached_sla'
                  ? 'text-rose-600 dark:text-rose-400'
                  : data.key_entities.sla_status === 'approaching_deadline'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {(data.key_entities.sla_status || 'within_sla').replace('_', ' ')}
              </span>
            </div>

            <div className="rounded-md bg-stone-100/60 dark:bg-stone-800/40 p-2">
              <span className="text-stone-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <User className="h-3 w-3" /> Officer
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block" title={data.key_entities.assigned_officer}>
                {data.key_entities.assigned_officer || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-stone-400">
          Executive summary is currently being computed...
        </div>
      )}
    </Card>
  );
};

