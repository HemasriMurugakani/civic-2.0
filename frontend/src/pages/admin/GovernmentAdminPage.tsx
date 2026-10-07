import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid
} from 'recharts';
import {
  Building2, Map, ShieldAlert, Award, Plus, Edit, Check,
  BarChart3, Database, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  KPIData, DepartmentLeaderboard, Department, Ward,
  Category, WardHotspot
} from '@/lib/types';
import { PageHeader } from '@/components/common/CommonUi';
import { StatCard } from '@/components/common/StatCard';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const GovernmentAdminPage: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'overview' | 'crud'>('overview');
  const [crudSection, setCrudSection] = useState<'departments' | 'wards' | 'categories'>('departments');

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [leaderboard, setLeaderboard] = useState<DepartmentLeaderboard[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State for CRUD
  const [createDeptModal, setCreateDeptModal] = useState(false);
  const [deptCode, setDeptCode] = useState('');
  const [deptNameEn, setDeptNameEn] = useState('');
  const [deptNameTa, setDeptNameTa] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getKpi(),
      api.getLeaderboard(),
      api.getDepartments(),
      api.getWards(),
      api.getCategories(),
    ])
      .then(([kpiRes, lbRes, deptRes, wardRes, catRes]) => {
        setKpi(kpiRes);
        setLeaderboard(lbRes);
        setDepartments(deptRes);
        setWards(wardRes);
        setCategories(catRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateDepartment = async () => {
    if (!deptCode || !deptNameEn) return;
    try {
      await fetch('/api/v1/master/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          code: deptCode,
          name_en: deptNameEn,
          name_ta: deptNameTa || deptNameEn,
          is_active: true,
        }),
      });
      setCreateDeptModal(false);
      setDeptCode('');
      setDeptNameEn('');
      setDeptNameTa('');
      api.getDepartments().then(setDepartments);
    } catch {}
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="State Governance Overview & Administration"
          subtitle="Cross-department accountability metrics, resolution verification rates, and administrative data management"
        />

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-stone-900 text-[#800000] dark:text-rose-400 shadow-2xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Governance Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crud')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'crud'
                ? 'bg-white dark:bg-stone-900 text-[#800000] dark:text-rose-400 shadow-2xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Master Data CRUD
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          {kpi && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Grievances (All Depts)"
                value={kpi.total_complaints.toLocaleString()}
                delta={kpi.total_trend_delta}
                icon={<Building2 className="h-5 w-5" />}
              />
              <StatCard
                label="Officially Resolved"
                value={kpi.resolved_complaints.toLocaleString()}
                subtext={`${((kpi.resolved_complaints / kpi.total_complaints) * 100).toFixed(1)}% department closure`}
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <StatCard
                label="Citizen Confirmed Rate"
                value={`${kpi.citizen_verified_rate}%`}
                delta={kpi.sla_trend_delta}
                deltaLabel="of resolved grievances"
                icon={<Award className="h-5 w-5" />}
              />
              <StatCard
                label="Global SLA Compliance"
                value={`${kpi.sla_compliance_rate}%`}
                subtext="Enforced across 12 zones"
                icon={<ShieldAlert className="h-5 w-5" />}
              />
            </div>
          )}

          {/* Officially Resolved % vs Citizen-Confirmed % Paired Visual */}
          <section className="rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Verification Reality Gap: Department-Resolved vs Citizen-Confirmed
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Compares what field officers mark as resolved against grievances that citizens independently verified on-site.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                Tamil Nadu Civic Service Standard
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboard} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="department_code" tick={{ fontSize: 11 }} stroke="#78716c" />
                  <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} stroke="#78716c" />
                  <Tooltip contentStyle={{ backgroundColor: '#1c1917', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="sla_compliance_rate" name="SLA Compliance %" fill="#800000" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="citizen_confirmed_rate" name="Citizen Confirmed %" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Department Leaderboard Table */}
          <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
              Department Governance Leaderboard
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 dark:border-stone-800 text-stone-400 font-semibold uppercase">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Total Volume</th>
                    <th className="p-3">Resolved</th>
                    <th className="p-3">SLA Compliance</th>
                    <th className="p-3">Avg Resolution (Days)</th>
                    <th className="p-3">Citizen Satisfaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboard.map((item, idx) => (
                    <tr key={item.department_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="p-3 font-mono font-bold text-[#800000] dark:text-rose-400">#{idx + 1}</td>
                      <td className="p-3 font-bold text-stone-900 dark:text-white">{item.department_name_en}</td>
                      <td className="p-3">{item.total_complaints.toLocaleString()}</td>
                      <td className="p-3 text-emerald-600 font-semibold">{item.resolved_complaints.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="font-bold text-[#800000] dark:text-rose-400">{item.sla_compliance_rate}%</span>
                      </td>
                      <td className="p-3 text-stone-500">{item.avg_resolution_days}d</td>
                      <td className="p-3 text-amber-500 font-bold">★ {item.avg_rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        /* Master Data CRUD View */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setCrudSection('departments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${crudSection === 'departments' ? 'bg-[#800000] text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Departments ({departments.length})
              </button>
              <button
                onClick={() => setCrudSection('wards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${crudSection === 'wards' ? 'bg-[#800000] text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Wards ({wards.length})
              </button>
              <button
                onClick={() => setCrudSection('categories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${crudSection === 'categories' ? 'bg-[#800000] text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                Categories ({categories.length})
              </button>
            </div>

            {crudSection === 'departments' && (
              <button
                onClick={() => setCreateDeptModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#800000] hover:bg-[#680000] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          {crudSection === 'departments' && (
            <DataTable
              columns={[
                { key: 'code', header: 'Code', sortable: true },
                { key: 'name_en', header: 'Department (English)', sortable: true },
                { key: 'name_ta', header: 'பெயர் (தமிழ்)' },
                {
                  key: 'is_active',
                  header: 'Status',
                  render: (d) => (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                      Active
                    </span>
                  ),
                },
              ]}
              data={departments}
              searchKey="name_en"
              searchPlaceholder="Filter departments..."
            />
          )}

          {crudSection === 'wards' && (
            <DataTable
              columns={[
                { key: 'ward_number', header: 'Ward Number', sortable: true },
                { key: 'name', header: 'Ward Name', sortable: true },
                { key: 'population', header: 'Population', render: (w) => w.population.toLocaleString(), sortable: true },
                { key: 'centroid_lat', header: 'Centroid Lat' },
                { key: 'centroid_lng', header: 'Centroid Lng' },
              ]}
              data={wards}
              searchKey="name"
              searchPlaceholder="Filter wards..."
            />
          )}

          {crudSection === 'categories' && (
            <DataTable
              columns={[
                { key: 'code', header: 'Code', sortable: true },
                { key: 'name_en', header: 'Category Name', sortable: true },
                { key: 'name_ta', header: 'வகை' },
                { key: 'sla_hours', header: 'SLA (Hours)', render: (c) => `${c.sla_hours}h`, sortable: true },
                { key: 'default_priority', header: 'Default Priority', sortable: true },
              ]}
              data={categories}
              searchKey="name_en"
              searchPlaceholder="Filter categories..."
            />
          )}

          {/* Create Department Modal */}
          <ConfirmDialog
            isOpen={createDeptModal}
            title="Create New Department"
            description="Add a new government agency or municipal board to the grievance workflow system."
            confirmLabel="Create Department"
            onConfirm={handleCreateDepartment}
            onCancel={() => setCreateDeptModal(false)}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Department Code (e.g. TRN)
                </label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TRN"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  required
                  value={deptNameEn}
                  onChange={(e) => setDeptNameEn(e.target.value)}
                  placeholder="e.g. Public Transport Corporation"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Name (Tamil)
                </label>
                <input
                  type="text"
                  value={deptNameTa}
                  onChange={(e) => setDeptNameTa(e.target.value)}
                  placeholder="e.g. போக்குவரத்து கழகம்"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white p-2 text-xs"
                />
              </div>
            </div>
          </ConfirmDialog>
        </div>
      )}
    </div>
  );
};
