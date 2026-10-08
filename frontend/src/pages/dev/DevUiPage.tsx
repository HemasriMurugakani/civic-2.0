import React, { useState } from 'react';
import {
  BarChart3, Sparkles, CheckCircle2, AlertTriangle,
  Clock, Shield, Star, RefreshCw, Download, Filter,
  Layers, Users, MapPin, Award, Check
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Skeleton,
  EmptyState,
  StatCard,
  ChartCard,
  Breadcrumbs,
  PageHeader,
  FilterBar,
  ExportButton
} from '@/components/ui';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { Timeline } from '@/components/common/Timeline';
import { StarRating, FileDropzone, Stepper, LanguageToggle, ThemeToggle, NotificationBell } from '@/components/common/CommonUi';
import { ComplaintItem } from '@/lib/types';
import { toast } from 'sonner';

export const DevUiPage: React.FC = () => {
  const [interactiveRating, setInteractiveRating] = useState(4);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentStepperStep, setCurrentStepperStep] = useState(2);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  const sampleComplaint: ComplaintItem = {
    id: 101,
    reference_no: 'GOV-2026-000101',
    citizen_id: 1,
    category_id: 1,
    category_name_en: 'Potholes on Road',
    category_name_ta: 'சாலையில் அபாயகரமான குழிகள்',
    department_id: 3,
    department_name_en: 'Roads & Stormwater Drains',
    ward_id: 51,
    ward_name: 'Zone 5 - Royapuram',
    ward_number: 51,
    title: 'Severe crater pothole on flyover descent',
    description: 'Deep crater on middle lane near descent. Multiple two-wheelers slipping, urgent cold mix patch needed.',
    channel: 'web',
    status: 'in_progress',
    final_priority: 'high',
    sla_deadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    sla_hours_total: 48,
    sla_status: 'within_sla',
    sla_remaining_hours: 18.0,
    sla_elapsed_percentage: 62.5,
    escalation_level: 0,
    created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleTimelineItems = [
    {
      id: 1,
      from_status: undefined,
      to_status: 'submitted',
      actor_name: 'Kavitha Sundaram',
      actor_role: 'Citizen',
      note: 'Grievance submitted via portal with coordinates.',
      timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    },
    {
      id: 2,
      from_status: 'submitted',
      to_status: 'assigned',
      actor_name: 'System Auto-Dispatcher',
      actor_role: 'System',
      note: 'Auto-assigned to Officer Murugan K. based on ward proximity and active workload.',
      timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString(),
    },
    {
      id: 3,
      from_status: 'assigned',
      to_status: 'acknowledged',
      actor_name: 'Murugan K.',
      actor_role: 'Nodal Officer',
      note: 'Inspected site. Cold mix asphalt vehicle mobilized.',
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    {
      id: 4,
      from_status: 'acknowledged',
      to_status: 'in_progress',
      actor_name: 'Murugan K.',
      actor_role: 'Nodal Officer',
      note: 'Field crew active on resurfacing.',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
  ];

  return (
    <div className="space-y-12 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      {/* PageHeader Primitive & Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: 'System', href: '/' },
          { label: 'Developer Suite', href: '/dev/ui' },
          { label: 'Design Tokens & 16 Primitives Showroom' },
        ]}
        title="Design System & UI Primitives Showroom"
        subtitle="Live showroom validating the 16 core UI primitives, color tokens, WCAG AA compliance, and dark/light contrast across Tamil Nadu civic interfaces."
        badge={
          <Badge variant="primary" size="sm">
            Milestone B2 Active
          </Badge>
        }
        action={
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />
            <Button
              variant="primary"
              size="sm"
              onClick={() => toast.success('Sonner Toast notification working!')}
            >
              Trigger Toast
            </Button>
          </div>
        }
      />

      {/* 1. Palette Tokens */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          1. Brand Palette Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <div className="rounded-xl p-3 bg-primary text-white font-mono shadow-xs">
            <span className="block font-bold">Namma Crimson</span>
            <span className="text-[10px] opacity-80">#800000 / var(--color-primary)</span>
          </div>
          <div className="rounded-xl p-3 bg-teal-600 text-white font-mono shadow-xs">
            <span className="block font-bold">Civic Teal</span>
            <span className="text-[10px] opacity-80">#0D9488</span>
          </div>
          <div className="rounded-xl p-3 bg-amber-500 text-white font-mono shadow-xs">
            <span className="block font-bold">Warm Amber</span>
            <span className="text-[10px] opacity-80">#D97706</span>
          </div>
          <div className="rounded-xl p-3 bg-rose-600 text-white font-mono shadow-xs">
            <span className="block font-bold">Breach Red</span>
            <span className="text-[10px] opacity-80">#DC2626</span>
          </div>
          <div className="rounded-xl p-3 bg-emerald-600 text-white font-mono shadow-xs">
            <span className="block font-bold">Verified Green</span>
            <span className="text-[10px] opacity-80">#16A34A</span>
          </div>
          <div className="rounded-xl p-3 bg-surface border border-border text-foreground font-mono shadow-xs">
            <span className="block font-bold">Semantic Surface</span>
            <span className="text-[10px] opacity-80">var(--color-surface)</span>
          </div>
        </div>
      </section>

      {/* 2. Button Primitives */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          2. Button Primitive Variants & Sizes
        </h2>
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" size="md">Primary Button</Button>
            <Button variant="secondary" size="md">Secondary Button</Button>
            <Button variant="outline" size="md">Outline Button</Button>
            <Button variant="ghost" size="md">Ghost Button</Button>
            <Button variant="destructive" size="md">Destructive Button</Button>
            <Button variant="link" size="md">Link Style</Button>
            <Button variant="primary" size="md" loading>Loading State</Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-border">
            <span className="text-xs text-stone-500">Sizes:</span>
            <Button variant="primary" size="sm">Small (sm)</Button>
            <Button variant="primary" size="md">Medium (md)</Button>
            <Button variant="primary" size="lg">Large (lg)</Button>
            <Button variant="primary" size="icon"><Sparkles className="w-4 h-4" /></Button>
          </div>
        </Card>
      </section>

      {/* 3. Badge & Status Indicators */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          3. Badge Primitive Variants & SLA Chips
        </h2>
        <Card className="p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">Badge Variants</span>
            <div className="flex flex-wrap gap-2.5">
              <Badge variant="primary" size="md">Primary</Badge>
              <Badge variant="secondary" size="md">Secondary</Badge>
              <Badge variant="outline" size="md">Outline</Badge>
              <Badge variant="success" size="md" dot>Success Dot</Badge>
              <Badge variant="warning" size="md" dot>Warning Dot</Badge>
              <Badge variant="destructive" size="md" dot>Destructive Dot</Badge>
              <Badge variant="info" size="md">Info</Badge>
              <Badge variant="neutral" size="md">Neutral</Badge>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">State Machine Badges</span>
            <div className="flex flex-wrap gap-2.5">
              <StatusBadge status="submitted" />
              <StatusBadge status="assigned" />
              <StatusBadge status="acknowledged" />
              <StatusBadge status="in_progress" />
              <StatusBadge status="resolved" />
              <StatusBadge status="citizen_verified" />
              <StatusBadge status="reopened" />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">Priority Dots & SLA Chips</span>
            <div className="flex flex-wrap gap-6 items-center">
              <PriorityDot priority="low" />
              <PriorityDot priority="medium" />
              <PriorityDot priority="high" />
              <PriorityDot priority="critical" />
              <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-2" />
              <SLAChip slaStatus="within_sla" remainingHours={24.5} elapsedPct={48} />
              <SLAChip slaStatus="approaching" remainingHours={5.2} elapsedPct={82} />
              <SLAChip slaStatus="breached" remainingHours={-8.0} elapsedPct={116} />
            </div>
          </div>
        </Card>
      </section>

      {/* 4. StatCard Primitive */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          4. StatCard Primitive (Deltas & Semantics)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Grievances"
            value="3,003"
            delta={12.4}
            deltaLabel="vs previous month"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            label="SLA Compliance"
            value="88.6%"
            delta={-2.1}
            deltaLabel="compliance delta"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            label="Citizen Satisfaction"
            value="4.4 / 5"
            delta={0.0}
            deltaLabel="neutral baseline"
            icon={<Star className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* 5. Input, Select, FilterBar, and ExportButton */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          5. FilterBar, Input, Select, and ExportButton Primitives
        </h2>
        <Card className="p-6 space-y-4">
          <FilterBar
            searchValue={filterSearch}
            onSearchChange={setFilterSearch}
            searchPlaceholder="Filter grievances, locations, or IDs..."
            actions={
              <ExportButton
                data={[{ id: 1, title: 'Sample' }]}
                filename="sample-export"
                title="Export Filtered"
              />
            }
          >
            <div className="w-48">
              <Select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                <option value="roads">Roads & Drains</option>
                <option value="water">Water Supply</option>
                <option value="sanitation">Solid Waste</option>
              </Select>
            </div>
          </FilterBar>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">Standard Input</label>
              <Input placeholder="Enter text..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">Disabled Input</label>
              <Input placeholder="Disabled state" disabled />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">Input with Error</label>
              <Input placeholder="Invalid field" error="Invalid field value" />
            </div>
          </div>
        </Card>
      </section>

      {/* 6. Table Primitive */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          6. Table Primitive
        </h2>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-bold text-primary">GOV-2026-000101</TableCell>
                <TableCell>Potholes on Road</TableCell>
                <TableCell>Ward 51 (Royapuram)</TableCell>
                <TableCell><PriorityDot priority="high" /></TableCell>
                <TableCell><StatusBadge status="in_progress" /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Inspect</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-bold text-primary">GOV-2026-000102</TableCell>
                <TableCell>Garbage Overflow</TableCell>
                <TableCell>Ward 114 (T. Nagar)</TableCell>
                <TableCell><PriorityDot priority="critical" /></TableCell>
                <TableCell><StatusBadge status="submitted" /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Inspect</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* 7. Skeleton & EmptyState */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          7. Skeleton & EmptyState Primitives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Card className="p-6 space-y-4">
            <span className="text-xs font-semibold text-stone-400 block">Skeleton Shimmer State</span>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </Card>

          <EmptyState
            title="No Active Violations Reported"
            description="Your selected ward currently has no overdue or open civic issues."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setModalOpen(true)}
              >
                Launch Demo Modal
              </Button>
            }
          />
        </div>
      </section>

      {/* 8. Modal Primitive */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal Primitive (Accessible Dialog)"
        description="Supports focus trapping, escape key dismissal, accessible header, and customizable footer."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => { setModalOpen(false); toast.success('Modal confirmed!'); }}>
              Confirm Action
            </Button>
          </div>
        }
      >
        <div className="py-2 text-xs text-stone-600 dark:text-stone-300 space-y-2 leading-relaxed">
          <p>
            The Modal primitive replaces fragmented dialogs across all 18 routes in AI-GovInsight.
            It ensures WCAG AA color compliance, clean padding, and responsive full-width bounds on mobile devices.
          </p>
        </div>
      </Modal>

      {/* 9. Stepper, Star Rating & Dropzone */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          9. Stepper, Star Rating & Dropzone
        </h2>
        <Card className="p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">Multi-Step Form Stepper</span>
            <Stepper
              steps={['Describe Issue', 'Pin Location', 'Review & Evidence']}
              currentStep={currentStepperStep}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentStepperStep(1)}>Step 1</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentStepperStep(2)}>Step 2</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentStepperStep(3)}>Step 3</Button>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">
              Interactive 5-Star Rating: Current {interactiveRating} / 5
            </span>
            <StarRating
              rating={interactiveRating}
              interactive={true}
              onChange={setInteractiveRating}
              size="lg"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">File Dropzone</span>
            <FileDropzone
              selectedFile={demoFile}
              onFileSelect={setDemoFile}
              onClear={() => setDemoFile(null)}
            />
          </div>
        </Card>
      </section>

      {/* 10. ComplaintCard & Action Timeline */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          10. ComplaintCard & Action Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">ComplaintCard Primitive</span>
            <ComplaintCard complaint={sampleComplaint} linkPrefix="/complaints" />
          </div>

          <Card className="p-6">
            <span className="text-xs font-semibold text-stone-400 block mb-4">Audit Timeline Primitive</span>
            <Timeline items={sampleTimelineItems} />
          </Card>
        </div>
      </section>
    </div>
  );
};
