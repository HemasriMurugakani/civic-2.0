import React, { useState } from 'react';
import {
  BarChart3, Sparkles, CheckCircle2, AlertTriangle,
  Clock, Shield, Star, RefreshCw
} from 'lucide-react';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { StatCard } from '@/components/common/StatCard';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { Timeline } from '@/components/common/Timeline';
import {
  PageHeader, EmptyState, StarRating, FileDropzone,
  Stepper, LanguageToggle, ThemeToggle, NotificationBell
} from '@/components/common/CommonUi';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ComplaintItem } from '@/lib/types';

export const DevUiPage: React.FC = () => {
  const [interactiveRating, setInteractiveRating] = useState(4);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStepperStep, setCurrentStepperStep] = useState(2);

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
    <div className="space-y-12 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-mono font-bold text-[#800000] dark:text-rose-400 uppercase">
            Storybook Showroom
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Design System & Shared Components (/dev/ui)
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Preview of all civic UI primitives, states, palettes, and light/dark theme contrast.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>

      {/* 1. Palette Swatches */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          1. Brand Palette Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <div className="rounded-xl p-3 bg-[#800000] text-white font-mono">
            <span className="block font-bold">Namma Crimson</span>
            <span className="text-[10px] opacity-80">#800000</span>
          </div>
          <div className="rounded-xl p-3 bg-teal-600 text-white font-mono">
            <span className="block font-bold">Civic Teal</span>
            <span className="text-[10px] opacity-80">#0D9488</span>
          </div>
          <div className="rounded-xl p-3 bg-amber-500 text-white font-mono">
            <span className="block font-bold">Warm Amber</span>
            <span className="text-[10px] opacity-80">#D97706</span>
          </div>
          <div className="rounded-xl p-3 bg-red-600 text-white font-mono">
            <span className="block font-bold">Breach Red</span>
            <span className="text-[10px] opacity-80">#DC2626</span>
          </div>
          <div className="rounded-xl p-3 bg-emerald-600 text-white font-mono">
            <span className="block font-bold">Verified Green</span>
            <span className="text-[10px] opacity-80">#16A34A</span>
          </div>
          <div className="rounded-xl p-3 bg-stone-800 text-white font-mono">
            <span className="block font-bold">Stone Surface</span>
            <span className="text-[10px] opacity-80">#1C1917</span>
          </div>
        </div>
      </section>

      {/* 2. Status Badges & Priorities */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          2. Status Badges & Priority Indicators
        </h2>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">All 7 State Machine Statuses</span>
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
            <span className="text-xs font-semibold text-stone-400 block mb-2">Priority Levels</span>
            <div className="flex flex-wrap gap-6 items-center">
              <PriorityDot priority="low" />
              <PriorityDot priority="medium" />
              <PriorityDot priority="high" />
              <PriorityDot priority="critical" />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">SLA Engine Chips</span>
            <div className="flex flex-wrap gap-3">
              <SLAChip slaStatus="within_sla" remainingHours={24.5} elapsedPct={48} />
              <SLAChip slaStatus="approaching" remainingHours={5.2} elapsedPct={82} />
              <SLAChip slaStatus="breached" remainingHours={-8.0} elapsedPct={116} />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stat Cards */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          3. StatCard Telemetry (with Deltas)
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

      {/* 4. Stepper & Interactive Star Rating */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          4. Stepper, Star Rating & Dropzone
        </h2>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">Multi-Step Form Stepper</span>
            <Stepper
              steps={['Describe Issue', 'Pin Location', 'Review & Evidence']}
              currentStep={currentStepperStep}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setCurrentStepperStep(1)}
                className="px-2.5 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
              >
                Step 1
              </button>
              <button
                onClick={() => setCurrentStepperStep(2)}
                className="px-2.5 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
              >
                Step 2
              </button>
              <button
                onClick={() => setCurrentStepperStep(3)}
                className="px-2.5 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300"
              >
                Step 3
              </button>
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
        </div>
      </section>

      {/* 5. Complaint Card & Timeline */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          5. ComplaintCard & Action Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-semibold text-stone-400 block mb-2">ComplaintCard Primitive</span>
            <ComplaintCard complaint={sampleComplaint} linkPrefix="/complaints" />
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
            <span className="text-xs font-semibold text-stone-400 block mb-4">Audit Timeline Primitive</span>
            <Timeline items={sampleTimelineItems} />
          </div>
        </div>
      </section>

      {/* 6. EmptyState & Modals */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          6. EmptyState & Accessible Dialog
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <EmptyState
            title="No Active Violations Reported"
            description="Your selected ward currently has no overdue or open civic issues."
            action={
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="rounded-xl bg-[#800000] hover:bg-[#680000] px-4 py-2 text-xs font-bold text-white transition shadow-sm"
              >
                Open Demo Dialog
              </button>
            }
          />

          <ConfirmDialog
            isOpen={dialogOpen}
            title="Design System Demo Dialog"
            description="This accessible modal supports focus rings, backdrop blurring, keyboard escape, and confirmation callbacks."
            confirmLabel="Confirm Action"
            onConfirm={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </section>
    </div>
  );
};
