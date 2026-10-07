import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Award, Download, ArrowLeft, CheckCircle2,
  Calendar, Check, AlertTriangle, ExternalLink, GraduationCap
} from 'lucide-react';
import { api } from '@/lib/api';
import { PublicCertificateVerify } from '@/lib/types';
import { NammaLogo } from '@/components/common/NammaLogo';

export const CertificateVerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<PublicCertificateVerify | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const fetchCert = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.verifyCertificate(code);
        setCert(data);
      } catch (err: any) {
        setError(err.message || 'Certificate verification failed');
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [code]);

  return (
    <div className="min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <NammaLogo size="md" />
        </Link>

        <Link
          to="/education"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 hover:bg-stone-50"
        >
          <GraduationCap className="w-4 h-4 text-[#800000]" />
          <span>Civic Academy</span>
        </Link>
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 flex items-center justify-center">
        {loading ? (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500 font-semibold">Verifying cryptographic credential with state registry...</p>
          </div>
        ) : error || !cert ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 md:p-12 text-center shadow-lg space-y-4 w-full">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-stone-900 dark:text-white">Certificate Not Found</h2>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              The credential ID <strong>{code}</strong> could not be authenticated against the Government of Tamil Nadu Civic Competency database.
            </p>
            <div className="pt-2">
              <Link
                to="/education"
                className="inline-flex px-5 py-2.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000]"
              >
                Explore Civic Courses
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6 w-full relative overflow-hidden">
            {/* Status Pill */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                <span>OFFICIAL & VERIFIED CREDENTIAL</span>
              </div>

              <span className="text-[11px] font-mono font-bold text-stone-400">
                {cert.certificate_code}
              </span>
            </div>

            {/* Emblem and Certificate Header */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto border-2 border-amber-500/30">
                <Award className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Government of Tamil Nadu
              </h1>
              <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-white">
                Certificate of Civic Competence
              </h2>
            </div>

            {/* Recipient Details */}
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 text-center space-y-3">
              <div className="text-xs text-stone-500">This official credential was awarded to:</div>
              <div className="text-2xl md:text-3xl font-black text-[#800000] dark:text-rose-400">
                {cert.recipient_name}
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                For successfully mastering all learning outcomes and passing the state evaluation for{' '}
                <strong>{cert.module_title || cert.title}</strong>.
              </div>
            </div>

            {/* Scores and Issue Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                <div className="text-[11px] text-stone-400">Demonstrated Score</div>
                <div className="text-lg font-black text-emerald-600 mt-0.5">{cert.score}%</div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
                <div className="text-[11px] text-stone-400">Date of Issuance</div>
                <div className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-1">
                  {new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>
              </div>
            </div>

            {/* Authority Signatures */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
              <div>
                <div className="font-bold text-stone-800 dark:text-stone-200">Dr. P. Karthikeyan, IAS</div>
                <div>Commissioner of Municipal Admin</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-800 dark:text-stone-200">T. Annamalai</div>
                <div>Director of e-Governance, TN</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={api.getCertificatePdfUrl(cert.certificate_code)}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res PDF Copy</span>
              </a>

              <Link
                to="/education"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <span>Browse Academy Courses</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-4 text-center text-xs text-stone-400">
        AI-GovInsight Digital Civic Platform &bull; Government of Tamil Nadu
      </footer>
    </div>
  );
};
