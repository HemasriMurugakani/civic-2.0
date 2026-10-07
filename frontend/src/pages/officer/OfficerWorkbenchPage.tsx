import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent
} from '@dnd-kit/core';
import {
  Kanban, Filter, CheckCircle, Clock, MapPin, Phone,
  Sparkles, AlertTriangle, ArrowRight, ShieldCheck, ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { ComplaintItem, ComplaintStatus, ComplaintPriority } from '@/lib/types';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { PageHeader, FileDropzone } from '@/components/common/CommonUi';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const KANBAN_COLUMNS: { id: ComplaintStatus; title: string; color: string }[] = [
  { id: 'assigned', title: 'Assigned', color: 'border-blue-500' },
  { id: 'acknowledged', title: 'Acknowledged', color: 'border-indigo-500' },
  { id: 'in_progress', title: 'In Progress', color: 'border-amber-500' },
  { id: 'resolved', title: 'Resolved', color: 'border-teal-500' },
];

export const OfficerWorkbenchPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';

  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragItem, setActiveDragItem] = useState<ComplaintItem | null>(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Resolve Dialog
  const [resolveComplaint, setResolveComplaint] = useState<ComplaintItem | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchComplaints = () => {
    setLoading(true);
    api
      .getComplaints({ limit: 100 })
      .then((data) => setComplaints(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const item = complaints.find((c) => c.id === Number(event.active.id));
    if (item) setActiveDragItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;
    const complaintId = Number(active.id);
    const targetStatus = over.id as ComplaintStatus;

    const currentComplaint = complaints.find((c) => c.id === complaintId);
    if (!currentComplaint || currentComplaint.status === targetStatus) return;

    // If target is resolved, open resolve dialog because note is mandatory!
    if (targetStatus === 'resolved') {
      setResolveComplaint(currentComplaint);
      return;
    }

    // Direct transition for other legal steps
    try {
      // Optimistic update
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: targetStatus } : c))
      );
      await api.updateStatus(complaintId, { status: targetStatus, note: `Moved to ${targetStatus}` });
    } catch {
      fetchComplaints();
    }
  };

  const handleAdvanceStatus = async (complaint: ComplaintItem, nextStatus: ComplaintStatus) => {
    if (nextStatus === 'resolved') {
      setResolveComplaint(complaint);
      return;
    }
    try {
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaint.id ? { ...c, status: nextStatus } : c))
      );
      await api.updateStatus(complaint.id, { status: nextStatus, note: `Status advanced to ${nextStatus}` });
    } catch {
      fetchComplaints();
    }
  };

  const handleConfirmResolve = async () => {
    if (!resolveComplaint || !resolveNote.trim()) {
      setResolveError('A resolution note explaining the fix is mandatory.');
      return;
    }
    setResolving(true);
    setResolveError(null);

    try {
      await api.updateStatus(resolveComplaint.id, {
        status: 'resolved',
        note: resolveNote.trim(),
      });

      if (afterPhoto) {
        await api.uploadEvidence(resolveComplaint.id, afterPhoto, 'after');
      }

      setResolveComplaint(null);
      setResolveNote('');
      setAfterPhoto(null);
      fetchComplaints();
    } catch (err: any) {
      setResolveError(err.message || 'Failed to mark as resolved');
    } finally {
      setResolving(false);
    }
  };

  // Filtered
  const filteredComplaints = complaints.filter((c) => {
    if (priorityFilter !== 'all' && c.final_priority !== priorityFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        c.reference_no.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.ward_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={t('officer.workbenchTitle')}
        subtitle={t('officer.workbenchSubtitle')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search reference or title..."
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-800 dark:text-white"
            />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs text-stone-800 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical Only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        }
      />

      <p className="text-xs text-stone-500 dark:text-stone-400">
        💡 {t('officer.dragHint')}
      </p>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((column) => {
            const columnItems = filteredComplaints.filter((c) => c.status === column.id);

            return (
              <div
                key={column.id}
                id={column.id}
                className={`rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 space-y-3 min-h-[500px] flex flex-col`}
              >
                <div className={`flex items-center justify-between border-t-4 pt-2 ${column.color}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                    {column.title}
                  </h3>
                  <span className="rounded-full bg-stone-200 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-bold text-stone-700 dark:text-stone-300">
                    {columnItems.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {columnItems.map((c) => {
                    const categoryName = isTamil
                      ? c.category_name_ta || c.category_name_en
                      : c.category_name_en;

                    // Next Status shortcut
                    const nextStatusMap: Record<ComplaintStatus, ComplaintStatus | null> = {
                      submitted: 'assigned',
                      assigned: 'acknowledged',
                      acknowledged: 'in_progress',
                      in_progress: 'resolved',
                      resolved: null,
                      citizen_verified: null,
                      reopened: 'in_progress',
                    };
                    const next = nextStatusMap[c.status];

                    return (
                      <div
                        key={c.id}
                        id={String(c.id)}
                        className="rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs transition hover:shadow-md cursor-grab active:cursor-grabbing space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                            {c.reference_no}
                          </span>
                          <PriorityDot priority={c.final_priority} showLabel={false} />
                        </div>

                        <h4
                          onClick={() => setSelectedComplaint(c)}
                          className="text-xs font-bold text-stone-900 dark:text-white hover:text-[#800000] cursor-pointer line-clamp-2"
                        >
                          {c.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="truncate max-w-[120px] font-medium text-stone-700 dark:text-stone-300">
                            {categoryName}
                          </span>
                          <span>{c.ward_name}</span>
                        </div>

                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                          <SLAChip
                            slaStatus={c.sla_status}
                            remainingHours={c.sla_remaining_hours}
                          />

                          {next && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(c, next)}
                              className="text-[10px] font-bold text-[#800000] hover:text-[#680000] dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-0.5 border border-rose-200 dark:border-rose-900 rounded px-1.5 py-0.5 hover:bg-rose-50"
                            >
                              <span>Advance</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {activeDragItem && (
          <DragOverlay>
            <div className="rounded-xl border border-[#800000]/40 bg-white dark:bg-stone-900 p-4 shadow-xl opacity-90 w-64 space-y-2">
              <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400">{activeDragItem.reference_no}</span>
              <p className="text-xs font-bold text-stone-900 dark:text-white line-clamp-1">{activeDragItem.title}</p>
            </div>
          </DragOverlay>
        )}
      </DndContext>

      {/* Mandatory Resolve Modal */}
      {resolveComplaint && (
        <ConfirmDialog
          isOpen={!!resolveComplaint}
          title={t('officer.resolveModalTitle')}
          description={`Completing grievance ${resolveComplaint.reference_no}. A field rectification note is required pursuant to citizen service guarantee.`}
          confirmLabel={t('officer.confirmResolve')}
          loading={resolving}
          onConfirm={handleConfirmResolve}
          onCancel={() => setResolveComplaint(null)}
        >
          <div className="space-y-4">
            {resolveError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{resolveError}</p>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {t('officer.resolveNoteLabel')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder={t('officer.resolveNotePlaceholder')}
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2.5 text-xs text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {t('officer.uploadAfterPhoto')}
              </label>
              <FileDropzone
                selectedFile={afterPhoto}
                onFileSelect={setAfterPhoto}
                onClear={() => setAfterPhoto(null)}
              />
            </div>
          </div>
        </ConfirmDialog>
      )}

      {/* Officer Detail & AI Placeholders Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="max-w-xl w-full rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2.5 py-0.5 rounded">
                  {selectedComplaint.reference_no}
                </span>
                <h3 className="text-base font-bold text-stone-900 dark:text-white mt-1">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {selectedComplaint.description}
            </p>

            {/* Masked Citizen Contact Info */}
            <div className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 p-3 text-xs">
              <Phone className="h-4 w-4 text-[#800000] dark:text-rose-400" />
              <span>Citizen Contact: <strong>{selectedComplaint.citizen_mobile_masked || '98******21'}</strong> (Privacy Protected)</span>
            </div>

            {/* AI Seams Placeholders (Milestone M8 / Section 7) */}
            <div className="space-y-3 pt-2">
              {/* AI Insights Card */}
              <div className="rounded-2xl border-2 border-dashed border-amber-300/80 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>AI Insights (Coming Soon)</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Automated IndicBERT multi-lingual urgency scoring and category classification will populate here when AI services are activated.
                </p>
              </div>

              {/* Similar Complaints Card */}
              <div className="rounded-2xl border-2 border-dashed border-rose-300/80 dark:border-rose-700/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-[#800000] dark:text-rose-300 text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-[#800000]" />
                  <span>Similar Complaints Nearby (Coming Soon)</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Vector similarity duplicate detection will link reports in the same 100m radius to eliminate redundant field visits.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl bg-stone-100 dark:bg-stone-800 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
