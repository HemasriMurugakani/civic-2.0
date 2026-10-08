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
  ComplaintItem, User as UserType
} from '@/lib/types';
import {
  PageHeader,
  StatCard,
  ChartCard,
  Card,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton
} from '@/components/ui';

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
  const [availableOfficers, setAvailableOfficers] = useState<UserType[]>([]);
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
      api.getOfficerWorkloads().then(setOfficerWorkloads);
    } catch {}
    finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Department Governance Dashboard"
        subtitle="Real-time KPI telemetry, officer dispatch workloads, and ward-level SLA compliance"
        badge={
          <Badge variant="primary" dot pulse>
            Live Telemetry
          </Badge>
        }
      />

      {/* KPI Cards Row */}
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

      {/* Daily Trend & Category Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="14-Day Grievance Trend"
          subtitle="Complaints received vs resolved over the past 2 weeks"
          period="Last 14 Days"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="currentColor" className="text-foreground-muted" />
              <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-foreground-muted" />
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
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="created_count" name="Received" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="resolved_count" name="Resolved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top Categories by Volume"
          subtitle="Distribution of incoming complaints by civic category"
          period="Last 30 Days"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoriesData.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
              <XAxis dataKey="name_en" tick={{ fontSize: 10 }} stroke="currentColor" className="text-foreground-muted" />
              <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-foreground-muted" />
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
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="count" name="Total Volume" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved_count" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Officer Workload Table with Reassign Action */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Officer Workload & Reassignment Queue
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              Current active grievance distributions across departmental officers
            </p>
          </div>
          <Badge variant="secondary">
            {officerWorkloads.length} Officers
          </Badge>
        </div>

        <TableContainer>
          <table className="w-full text-left border-collapse text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Officer Name</TableHead>
                <TableHead>Active Cases</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Overdue SLA</TableHead>
                <TableHead>Avg Resolution Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {officerWorkloads.map((ow) => (
                <TableRow key={ow.officer_id}>
                  <TableCell className="font-semibold text-foreground">
                    {ow.officer_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary" size="sm">
                      {ow.active_complaints}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {ow.resolved_complaints}
                  </TableCell>
                  <TableCell>
                    {ow.overdue_complaints > 0 ? (
                      <Badge variant="danger" size="sm">
                        {ow.overdue_complaints} overdue
                      </Badge>
                    ) : (
                      <span className="text-foreground-muted">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground-muted">
                    {ow.avg_resolution_hours}h
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReassignComplaintId(ow.active_complaints > 0 ? 1 : null)}
                      className="text-[11px] h-7 px-2 font-bold"
                    >
                      Rebalance
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </TableContainer>
      </Card>

      {/* Ward Hotspots Summary Table */}
      <Card className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Ward-Level Hotspots & Grievance Density
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Geographic density and resolution rates across administrative wards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {wardHotspots.slice(0, 6).map((wh) => (
            <Card
              key={wh.ward_id}
              className="bg-surface-muted/40 p-4 space-y-2 border-border"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">{wh.ward_name}</span>
                <span className="text-xs font-mono font-bold text-primary">{wh.total_complaints} total</span>
              </div>
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Unresolved: {wh.unresolved_count}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wh.sla_compliance_rate}% SLA</span>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Reassign Modal */}
      {reassignComplaintId && (
        <Modal
          isOpen={!!reassignComplaintId}
          onClose={() => setReassignComplaintId(null)}
          title="Reassign Grievance Workload"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-foreground-muted">
              Select an available field officer in your department to transfer this case workload.
            </p>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Target Officer
              </label>
              <Select
                value={targetOfficerId}
                onChange={(e) => setTargetOfficerId(e.target.value ? Number(e.target.value) : '')}
                options={[
                  { value: '', label: 'Select target officer...' },
                  ...availableOfficers.map((o) => ({
                    value: String(o.id),
                    label: `${o.name} (${o.role})`
                  }))
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Reason / Note
              </label>
              <Input
                type="text"
                value={reassignNote}
                onChange={(e) => setReassignNote(e.target.value)}
                placeholder="e.g. Workload balancing or geographic transfer"
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setReassignComplaintId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={reassigning}
                onClick={handleReassign}
              >
                Execute Reassignment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

