import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent
} from '@dnd-kit/core';
import {
  Kanban, Filter, CheckCircle, Clock, MapPin, Phone,
  Sparkles, AlertTriangle, ArrowRight, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { ComplaintItem, ComplaintStatus, ComplaintPriority } from '@/lib/types';
import { PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { FileDropzone } from '@/components/common/CommonUi';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal
} from '@/components/ui';

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

    if (targetStatus === 'resolved') {
      setResolveComplaint(currentComplaint);
      return;
    }

    try {
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
    <div className="space-y-6">
      <PageHeader
        title={t('officer.workbenchTitle') || 'Officer Workbench'}
        subtitle={t('officer.workbenchSubtitle') || 'Manage and advance assigned citizen complaints across their lifecycle.'}
        badge={
          <Badge variant="info">
            Field Officer Operations
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search reference, title, ward..."
              className="w-48 sm:w-60"
            />
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'critical', label: 'Critical Only' },
                { value: 'high', label: 'High Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'low', label: 'Low Priority' },
              ]}
              className="w-40"
            />
          </div>
        }
      />

      <p className="text-xs text-foreground-muted flex items-center gap-1.5">
        <span>💡</span>
        <span>{t('officer.dragHint') || 'Drag and drop cards between status columns to update status, or use the Advance button.'}</span>
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
                className="rounded-2xl border border-border bg-surface-muted/30 p-3.5 space-y-3 min-h-[500px] flex flex-col"
              >
                <div className={`flex items-center justify-between border-t-4 pt-2 ${column.color}`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {column.title}
                  </h3>
                  <Badge variant="secondary" size="sm">
                    {columnItems.length}
                  </Badge>
                </div>

                <div className="flex-1 space-y-3">
                  {columnItems.map((c) => {
                    const categoryName = isTamil
                      ? c.category_name_ta || c.category_name_en
                      : c.category_name_en;

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
                      <Card
                        key={c.id}
                        id={String(c.id)}
                        className="p-3.5 transition hover:shadow-raised cursor-grab active:cursor-grabbing space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {c.reference_no}
                          </span>
                          <PriorityDot priority={c.final_priority} showLabel={false} />
                        </div>

                        <h4
                          onClick={() => setSelectedComplaint(c)}
                          className="text-xs font-bold text-foreground hover:text-primary cursor-pointer line-clamp-2"
                        >
                          {c.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                          <span className="truncate max-w-[120px] font-medium text-foreground">
                            {categoryName}
                          </span>
                          <span>{c.ward_name}</span>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                          <SLAChip
                            slaStatus={c.sla_status}
                            remainingHours={c.sla_remaining_hours}
                          />

                          {next && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdvanceStatus(c, next)}
                              className="text-[10px] h-7 px-2 font-bold"
                              rightIcon={<ChevronRight className="h-3 w-3" />}
                            >
                              Advance
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {activeDragItem && (
          <DragOverlay>
            <Card className="border-primary/50 shadow-overlay w-64 space-y-2 p-3.5 opacity-90">
              <span className="font-mono text-xs font-bold text-primary">{activeDragItem.reference_no}</span>
              <p className="text-xs font-bold text-foreground line-clamp-1">{activeDragItem.title}</p>
            </Card>
          </DragOverlay>
        )}
      </DndContext>

      {/* Mandatory Resolve Modal */}
      {resolveComplaint && (
        <Modal
          isOpen={!!resolveComplaint}
          onClose={() => setResolveComplaint(null)}
          title={t('officer.resolveModalTitle') || 'Field Rectification & Resolution'}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-foreground-muted">
              Completing grievance <strong className="font-mono text-primary">{resolveComplaint.reference_no}</strong>. A field rectification note is required pursuant to citizen service guarantee.
            </p>

            {resolveError && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 p-2.5 rounded-lg">{resolveError}</p>
            )}

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t('officer.resolveNoteLabel') || 'Rectification Action Note'} <span className="text-danger">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder={t('officer.resolveNotePlaceholder') || 'Detail work completed, contractor assigned, or materials deployed...'}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {t('officer.uploadAfterPhoto') || 'After-photo evidence'}
              </label>
              <FileDropzone
                selectedFile={afterPhoto}
                onFileSelect={setAfterPhoto}
                onClear={() => setAfterPhoto(null)}
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setResolveComplaint(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={resolving}
                onClick={handleConfirmResolve}
                leftIcon={<CheckCircle className="h-4 w-4" />}
              >
                {t('officer.confirmResolve') || 'Mark Resolved'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Officer Detail & AI Insights Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                {selectedComplaint.reference_no}
              </span>
              <span className="text-sm font-bold text-foreground truncate">{selectedComplaint.title}</span>
            </div>
          }
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-foreground leading-relaxed">
              {selectedComplaint.description}
            </p>

            {/* Masked Citizen Contact Info */}
            <div className="flex items-center gap-2 rounded-xl bg-surface-muted p-3 text-xs border border-border">
              <Phone className="h-4 w-4 text-primary" />
              <span>Citizen Contact: <strong className="font-mono">{selectedComplaint.citizen_mobile_masked || '98******21'}</strong> (Privacy Protected)</span>
            </div>

            {/* AI Seams Placeholders */}
            <div className="space-y-3 pt-2">
              <Card className="border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>AI Insights</span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Automated IndicBERT multi-lingual urgency scoring and category classification will populate here when AI services are activated.
                </p>
              </Card>

              <Card className="border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-primary text-xs font-bold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Similar Complaints Nearby</span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Vector similarity duplicate detection will link reports in the same 100m radius to eliminate redundant field visits.
                </p>
              </Card>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

