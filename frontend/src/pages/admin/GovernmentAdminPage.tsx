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
import {
  PageHeader,
  StatCard,
  ChartCard,
  Card,
  Badge,
  Button,
  Input,
  Modal,
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton
} from '@/components/ui';
import { DataTable } from '@/components/common/DataTable';

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
    <div className="space-y-6 pb-12">
      <PageHeader
        title="State Governance Overview & Administration"
        subtitle="Cross-department accountability metrics, resolution verification rates, and administrative data management."
        badge={
          <Badge variant="primary">
            State Administration
          </Badge>
        }
        actions={
          <div className="flex rounded-xl bg-surface-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition min-h-[36px] ${
                activeTab === 'overview'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Governance Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('crud')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition min-h-[36px] ${
                activeTab === 'crud'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Master Data CRUD
            </button>
          </div>
        }
      />

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ) : kpi && (
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
                subtext={`${((kpi.resolved_complaints / (kpi.total_complaints || 1)) * 100).toFixed(1)}% department closure`}
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
          <ChartCard
            title="Verification Reality Gap: Department-Resolved vs Citizen-Confirmed"
            subtitle="Compares what field officers mark as resolved against grievances that citizens independently verified on-site."
            period="Tamil Nadu Service Standard"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboard} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                <XAxis dataKey="department_code" tick={{ fontSize: 11 }} stroke="currentColor" className="text-foreground-muted" />
                <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} stroke="currentColor" className="text-foreground-muted" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-foreground)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="sla_compliance_rate" name="SLA Compliance %" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="citizen_confirmed_rate" name="Citizen Confirmed %" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Department Leaderboard Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Department Governance Leaderboard
                </h3>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Statewide performance ranking based on verified grievance delivery
                </p>
              </div>
              <Badge variant="secondary">
                {leaderboard.length} Departments
              </Badge>
            </div>

            <TableContainer>
              <table className="w-full text-left border-collapse text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Volume</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>SLA Compliance</TableHead>
                    <TableHead>Avg Resolution</TableHead>
                    <TableHead className="text-right">Citizen Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((item, idx) => (
                    <TableRow key={item.department_id}>
                      <TableCell className="font-mono font-bold text-primary">
                        #{idx + 1}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        {item.department_name_en}
                      </TableCell>
                      <TableCell>{item.total_complaints.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.resolved_complaints.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary" size="sm">
                          {item.sla_compliance_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground-muted">
                        {item.avg_resolution_days}d
                      </TableCell>
                      <TableCell className="text-right text-amber-500 font-bold">
                        ★ {item.avg_rating}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </TableContainer>
          </Card>
        </div>
      ) : (
        /* Master Data CRUD View */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCrudSection('departments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                  crudSection === 'departments'
                    ? 'bg-primary text-primary-contrast shadow-xs'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                Departments ({departments.length})
              </button>
              <button
                type="button"
                onClick={() => setCrudSection('wards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                  crudSection === 'wards'
                    ? 'bg-primary text-primary-contrast shadow-xs'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                Wards ({wards.length})
              </button>
              <button
                type="button"
                onClick={() => setCrudSection('categories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                  crudSection === 'categories'
                    ? 'bg-primary text-primary-contrast shadow-xs'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                Categories ({categories.length})
              </button>
            </div>

            {crudSection === 'departments' && (
              <Button
                variant="primary"
                onClick={() => setCreateDeptModal(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Department
              </Button>
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
                  render: () => (
                    <Badge variant="success" size="sm">
                      Active
                    </Badge>
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
          {createDeptModal && (
            <Modal
              isOpen={createDeptModal}
              onClose={() => setCreateDeptModal(false)}
              title="Create New Department"
              size="md"
            >
              <div className="space-y-4">
                <p className="text-xs text-foreground-muted">
                  Add a new government agency or municipal board to the grievance workflow system.
                </p>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Department Code (e.g. TRN)
                  </label>
                  <Input
                    type="text"
                    required
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TRN"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Name (English)
                  </label>
                  <Input
                    type="text"
                    required
                    value={deptNameEn}
                    onChange={(e) => setDeptNameEn(e.target.value)}
                    placeholder="e.g. Public Transport Corporation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Name (Tamil)
                  </label>
                  <Input
                    type="text"
                    value={deptNameTa}
                    onChange={(e) => setDeptNameTa(e.target.value)}
                    placeholder="e.g. போக்குவரத்து கழகம்"
                  />
                </div>

                <div className="pt-3 border-t border-border flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setCreateDeptModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateDepartment}
                  >
                    Create Department
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
};

