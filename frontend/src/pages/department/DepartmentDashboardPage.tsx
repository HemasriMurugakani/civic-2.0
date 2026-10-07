import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import {
  BarChart3, Users, AlertTriangle, Clock, Star,
  TrendingUp, CheckCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  KPIData, DailyTrend, WardHotspot, OfficerWorkload,
  ComplaintItem, User
} from '@/lib/types';
import { StatCard } from '@/components/common/StatCard';
import { PageHeader } from '@/components/common/CommonUi';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const DepartmentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [wardHotspots, setWardHotspots] = useState<WardHotspot[]>([]);
  const [officerWorkloads, setOfficerWorkloads] = useState<OfficerWorkload[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reassign Modal
  const [reassignComplaintId, setReassignComplaintId] = useState<number | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<User[]>([]);
  const [targetOfficerId, setTargetOfficerId] = useState<number | ''>('');
  const [reassignNote, setReassignNote] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getKpi(),
      api.getDailyTrends(14),
      api.getWardHotspots(60),
      api.getOfficerWorkloads(),
      api.getCategoriesAnalytics(30),
      api.getOfficers(user?.department_id),
    ])
      .then(([kpiRes, trendsRes, wardsRes, officersRes, catsRes, officersList]) => {
        setKpi(kpiRes);
        setTrends(trendsRes);
        setWardHotspots(wardsRes);
        setOfficerWorkloads(officersRes);
        setCategoriesData(catsRes);
        setAvailableOfficers(officersList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleReassign = async () => {
    if (!reassignComplaintId || !targetOfficerId) return;
    setReassigning(true);
    try {
      await api.reassignComplaint(reassignComplaintId, Number(targetOfficerId), reassignNote || undefined);
      setReassignComplaintId(null);
      setTargetOfficerId('');
      setReassignNote('');
      // Refresh workloads
      api.getOfficerWorkloads().then(setOfficerWorkloads);
    } catch {}
    finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Department Governance Dashboard"
        subtitle="Real-time KPI telemetry, officer dispatch workloads, and ward-level SLA compliance"
      />

      {/* KPI Cards Row */}
      {kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Grievances"
            value={kpi.total_complaints.toLocaleString()}
            delta={kpi.total_trend_delta}
            deltaLabel="vs previous 30d"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            label="Pending / Active"
            value={kpi.pending_complaints.toLocaleString()}
            subtext="Assigned across field staff"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            label="SLA Compliance"
            value={`${kpi.sla_compliance_rate}%`}
            delta={kpi.sla_trend_delta}
            deltaLabel="compliance rate"
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <StatCard
            label="Citizen Rating"
            value={`${kpi.avg_rating} / 5`}
            delta={kpi.rating_trend_delta}
            deltaLabel="satisfaction"
            icon={<Star className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Recharts: Daily Trend & Category Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
            14-Day Grievance Trend (Received vs Resolved)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#78716c" />
                <YAxis tick={{ fontSize: 10 }} stroke="#78716c" />
                <Tooltip contentStyle={{ backgroundColor: '#1c1917', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="created_count" name="Received" stroke="#800000" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="resolved_count" name="Resolved" stroke="#059669" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
            Top Categories by Volume
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoriesData.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name_en" tick={{ fontSize: 10 }} stroke="#78716c" />
                <YAxis tick={{ fontSize: 10 }} stroke="#78716c" />
                <Tooltip contentStyle={{ backgroundColor: '#1c1917', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="count" name="Total Volume" fill="#800000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved_count" name="Resolved" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Officer Workload Table with Reassign Action */}
      <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
            Officer Workload & Reassignment Queue
          </h3>
          <span className="text-xs text-stone-400">{officerWorkloads.length} Active Officers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 uppercase font-semibold">
                <th className="p-3">Officer Name</th>
                <th className="p-3">Active Cases</th>
                <th className="p-3">Resolved</th>
                <th className="p-3">Overdue SLA</th>
                <th className="p-3">Avg Resolution Time</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {officerWorkloads.map((ow) => (
                <tr key={ow.officer_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                  <td className="p-3 font-semibold text-stone-900 dark:text-white">{ow.officer_name}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-rose-50 dark:bg-rose-950 px-2.5 py-0.5 text-[#800000] dark:text-rose-300 font-bold">
                      {ow.active_complaints}
                    </span>
                  </td>
                  <td className="p-3 text-emerald-600 font-semibold">{ow.resolved_complaints}</td>
                  <td className="p-3">
                    {ow.overdue_complaints > 0 ? (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950 px-2 py-0.5 text-rose-700 dark:text-rose-300 font-bold">
                        {ow.overdue_complaints} overdue
                      </span>
                    ) : (
                      <span className="text-stone-400">0</span>
                    )}
                  </td>
                  <td className="p-3 text-stone-500">{ow.avg_resolution_hours}h</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setReassignComplaintId(ow.active_complaints > 0 ? 1 : null)}
                      className="rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-[11px] font-bold text-[#800000] hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    >
                      Rebalance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ward Hotspots Summary Table */}
      <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          Ward-Level Hotspots & Grievance Density
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {wardHotspots.slice(0, 6).map((wh) => (
            <div
              key={wh.ward_id}
              className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50/70 dark:bg-stone-800/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900 dark:text-white">{wh.ward_name}</span>
                <span className="text-xs font-mono font-bold text-[#800000] dark:text-rose-400">{wh.total_complaints} total</span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Unresolved: {wh.unresolved_count}</span>
                <span className="text-emerald-600 font-semibold">{wh.sla_compliance_rate}% SLA</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reassign Modal */}
      {reassignComplaintId && (
        <ConfirmDialog
          isOpen={!!reassignComplaintId}
          title="Reassign Grievance to Another Officer"
          description="Select an available field officer in your department to transfer this case workload."
          confirmLabel="Execute Reassignment"
          loading={reassigning}
          onConfirm={handleReassign}
          onCancel={() => setReassignComplaintId(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Target Officer
              </label>
              <select
                value={targetOfficerId}
                onChange={(e) => setTargetOfficerId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 p-2 text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              >
                <option value="">Select target officer...</option>
                {availableOfficers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                value={reassignNote}
                onChange={(e) => setReassignNote(e.target.value)}
                placeholder="e.g. Workload balancing"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 p-2 text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};
