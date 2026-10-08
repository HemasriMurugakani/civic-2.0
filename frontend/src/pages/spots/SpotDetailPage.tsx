import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Clock, Heart, Shield, CheckCircle2,
  AlertTriangle, Camera, Upload, ArrowLeft, ExternalLink,
  Plus, Check, X, Award, User, RefreshCw, AlertCircle, FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  SpotDetail, SpotStatus, CareFrequency
} from '@/lib/types';
import { toast } from 'sonner';
import {
  Breadcrumbs,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  EmptyState,
  Skeleton
} from '@/components/ui';

export const SpotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkins' | 'issues' | 'history'>('checkins');

  // Check-in Modal
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinPhoto, setCheckinPhoto] = useState('');
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  // Adoption Modal
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [careFrequency, setCareFrequency] = useState<CareFrequency>('weekly');
  const [adopting, setAdopting] = useState(false);

  // Release Modal
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [releasing, setReleasing] = useState(false);

  // Status Change Modal (Officers/Admins)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<SpotStatus>('maintenance');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchSpotDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getSpotDetail(id);
      setSpot(data);
      if (data.commitment_actions) {
        setSelectedActions(data.commitment_actions);
        setCompletedActions(data.commitment_actions);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load spot details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="py-20 text-center space-y-4">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 text-danger" />}
          title="Spot Not Found"
          description="The requested civic spot could not be located in our registry."
          action={
            <Button asChild variant="primary">
              <Link to="/spots">Back to Adopt-a-Spot directory</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isAdopter = Boolean(user && spot.adopted_by === user.id);
  const isStaff = Boolean(user && ['gov_admin', 'dept_admin', 'officer'].includes(user.role));
  const isAvailable = spot.status === 'available';

  const handleAdopt = async () => {
    if (!user) {
      toast.error('Please sign in to adopt a spot');
      navigate('/login');
      return;
    }
    try {
      setAdopting(true);
      await api.adoptSpot(spot.id, {
        commitment_actions: selectedActions.length ? selectedActions : ['Litter cleaning', 'Monitoring & reporting'],
        care_frequency: careFrequency,
      });
      toast.success('🎉 Congratulations! You adopted this spot (+100 Civic Points).');
      setShowAdoptModal(false);
      fetchSpotDetail();
    } catch (err: any) {
      toast.error(err.message || 'Adoption failed');
    } finally {
      setAdopting(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinNote.trim()) {
      toast.error('Please provide a short note about the care performed');
      return;
    }
    try {
      setSubmittingCheckin(true);
      await api.checkinSpot(spot.id, {
        note: checkinNote.trim(),
        photo_url: checkinPhoto.trim() || undefined,
        actions_completed: completedActions,
      });
      toast.success('✅ Check-in logged! You earned +15 Civic Points.');
      setShowCheckinModal(false);
      setCheckinNote('');
      setCheckinPhoto('');
      fetchSpotDetail();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit check-in');
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleRelease = async () => {
    try {
      setReleasing(true);
      await api.releaseSpot(spot.id, {
        reason: releaseReason.trim() || undefined,
      });
      toast.success('Spot care commitment released.');
      setShowReleaseModal(false);
      fetchSpotDetail();
    } catch (err: any) {
      toast.error(err.message || 'Failed to release spot');
    } finally {
      setReleasing(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setUpdatingStatus(true);
      await api.updateSpotStatus(spot.id, {
        status: newStatus,
        note: statusNote.trim() || undefined,
      });
      toast.success(`Spot status updated to ${newStatus}`);
      setShowStatusModal(false);
      fetchSpotDetail();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'Adopt-a-Spot', href: '/spots' },
            { label: spot.name },
          ]}
        />

        {isStaff && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusModal(true)}
          >
            Staff: Update Status
          </Button>
        )}
      </div>

      {/* Hero Banner Card */}
      <Card className="p-0 overflow-hidden shadow-raised">
        <div className="relative h-64 sm:h-80 bg-surface-muted overflow-hidden">
          {spot.photo_url ? (
            <img
              src={spot.photo_url}
              alt={spot.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              📍
            </div>
          )}

          <div className="absolute inset-0 bg-linear-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

          {/* Badges on Top */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-stone-900 backdrop-blur-md shadow-xs">
              <span className="capitalize">{spot.spot_type.replace('_', ' ')}</span>
            </span>
            <Badge
              variant={spot.status === 'available' ? 'success' : spot.status === 'adopted' ? 'warning' : 'secondary'}
              dot
            >
              {spot.status.toUpperCase()}
            </Badge>
          </div>

          {/* Hero Bottom Information */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight drop-shadow-xs">
              {spot.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-200">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-300" />
                <span>{spot.address}</span>
              </span>
              <span>•</span>
              <span>{spot.district}</span>
              {spot.ward_name && (
                <>
                  <span>•</span>
                  <span>{spot.ward_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Ribbon */}
        <div className="p-6 bg-surface-muted/40 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-foreground-muted">
            <div>
              <span className="text-foreground-muted block text-[11px]">Check-in Cadence</span>
              <span className="font-bold text-foreground capitalize">{spot.care_frequency}</span>
            </div>
            <div>
              <span className="text-foreground-muted block text-[11px]">Verified Check-ins</span>
              <span className="font-bold text-foreground">{spot.checkins?.length || 0}</span>
            </div>
            <div>
              <span className="text-foreground-muted block text-[11px]">Linked Grievances</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {spot.linked_complaints?.length || 0} issues
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Report Grievance Link */}
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link
                to={`/report?spot_id=${spot.id}&spot_name=${encodeURIComponent(spot.name)}&address=${encodeURIComponent(spot.address)}&lat=${spot.latitude}&lng=${spot.longitude}`}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Report Issue Here
              </Link>
            </Button>

            {/* Adopt / Check-in CTA */}
            {isAvailable ? (
              <Button
                variant="primary"
                onClick={() => setShowAdoptModal(true)}
                leftIcon={<Heart className="h-4 w-4" />}
              >
                Adopt Spot (+100 Pts)
              </Button>
            ) : isAdopter || isStaff ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => setShowCheckinModal(true)}
                  leftIcon={<Camera className="h-4 w-4" />}
                >
                  Log Check-in (+15 Pts)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowReleaseModal(true)}
                >
                  Release
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Stewardship / Adopter Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description & Commitment Actions */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              About This Spot & Guidelines
            </h3>
            <p className="text-xs text-foreground-muted leading-relaxed font-normal">
              {spot.description ||
                'This public location has been designated under the NammaTN Adopt-a-Spot program for citizen-led neighborhood upkeep, cleanliness monitoring, and civic pride.'}
            </p>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-foreground mb-2">
                Pledged Care Commitments:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(spot.commitment_actions?.length ? spot.commitment_actions : ['Litter inspection', 'Plant care & watering', 'Reporting defects']).map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted text-xs text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="border-b border-border flex gap-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('checkins')}
              className={`pb-3 border-b-2 transition min-h-[36px] ${
                activeTab === 'checkins'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Verified Check-ins ({spot.checkins?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('issues')}
              className={`pb-3 border-b-2 transition min-h-[36px] ${
                activeTab === 'issues'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Linked Grievances ({spot.linked_complaints?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-3 border-b-2 transition min-h-[36px] ${
                activeTab === 'history'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              Adoption History ({spot.history?.length || 0})
            </button>
          </div>

          {/* Tab 1: Check-ins Timeline */}
          {activeTab === 'checkins' && (
            <div className="space-y-4">
              {!spot.checkins || spot.checkins.length === 0 ? (
                <EmptyState
                  icon={<Camera className="h-8 w-8 text-foreground-muted" />}
                  title="No check-ins logged yet"
                  description="The registered caretaker will post periodic photos and inspection updates."
                />
              ) : (
                spot.checkins.map((chk) => (
                  <Card
                    key={chk.id}
                    className="p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                          ✓
                        </div>
                        <div>
                          <span className="font-bold text-foreground">
                            {chk.user_display_name || 'Caretaker'}
                          </span>
                          <span className="text-foreground-muted text-[11px] block">
                            {new Date(chk.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <Badge variant="success" size="sm">
                        +{chk.points_awarded} Points
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed font-normal">
                      {chk.note}
                    </p>

                    {chk.actions_completed && chk.actions_completed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {chk.actions_completed.map((act, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            size="sm"
                          >
                            ✓ {act}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {chk.photo_url && (
                      <div className="pt-2">
                        <img
                          src={chk.photo_url}
                          alt="Checkin proof"
                          className="h-44 w-auto rounded-xl object-cover border border-border"
                        />
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Linked Grievances */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              {!spot.linked_complaints || spot.linked_complaints.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-8 w-8 text-foreground-muted" />}
                  title="No grievances reported"
                  description="No civic issues currently flagged at this spot."
                />
              ) : (
                spot.linked_complaints.map((comp) => (
                  <Card
                    key={comp.id}
                    className="p-4 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] text-foreground-muted">
                        {comp.reference_no}
                      </span>
                      <h4 className="font-bold text-foreground">{comp.title}</h4>
                      <span className="text-[10px] text-foreground-muted">
                        Filed {new Date(comp.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="warning" size="sm">
                        {comp.status}
                      </Badge>
                      <Link
                        to={`/issues/${comp.id}`}
                        className="text-primary font-bold hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Adoption History Audit Log */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {!spot.history || spot.history.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-8 w-8 text-foreground-muted" />}
                  title="No prior history"
                  description="No historical care records found for this location."
                />
              ) : (
                spot.history.map((hist) => (
                  <Card
                    key={hist.id}
                    className="p-3.5 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold capitalize text-foreground">
                        {hist.action.replace('_', ' ')}
                      </span>{' '}
                      <span className="text-foreground-muted">by {hist.user_display_name}</span>
                      {hist.reason && (
                        <p className="text-[11px] text-foreground-muted mt-0.5">{hist.reason}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      {new Date(hist.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Adopter Information & Cadence */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Stewardship Status</span>
            </h3>

            {spot.status === 'adopted' ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-foreground space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <User className="h-3.5 w-3.5" />
                    <span>{isAdopter ? 'Adopted by You' : spot.adopter_name || 'Active Citizen'}</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    Adopted on {spot.adopted_at ? new Date(spot.adopted_at).toLocaleDateString('en-IN') : 'Recently'}
                  </p>
                </div>

                <div className="space-y-2 text-foreground-muted">
                  <div className="flex justify-between">
                    <span>Cadence:</span>
                    <span className="font-semibold text-foreground capitalize">{spot.care_frequency} Check-ins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Check-in:</span>
                    <span className="font-semibold text-foreground">
                      {spot.last_checkin_at
                        ? new Date(spot.last_checkin_at).toLocaleDateString('en-IN')
                        : 'Pending first check-in'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Missed Cycles:</span>
                    <span className={`font-semibold ${spot.missed_checkins_count > 0 ? 'text-danger' : 'text-success'}`}>
                      {spot.missed_checkins_count} / 3 max
                    </span>
                  </div>
                </div>

                {spot.missed_checkins_count >= 2 && (
                  <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Warning: 1 more missed check-in will auto-release this spot back to the community.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-bold">Available for Citizen Adoption</p>
                  <p className="text-[11px] text-foreground-muted">
                    Be the local guardian for this spot and help maintain Chennai&apos;s civic green spaces.
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setShowAdoptModal(true)}
                >
                  Adopt Spot (+100 Pts)
                </Button>
              </div>
            )}
          </Card>

          {/* Quick FAQ / Guidelines */}
          <Card className="bg-surface-muted/40 p-6 text-xs space-y-3">
            <h4 className="font-bold text-foreground">How Adopt-a-Spot Works:</h4>
            <ul className="space-y-2 text-foreground-muted text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">1.</span>
                <span>Pledge 2–3 simple care actions according to your cadence.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">2.</span>
                <span>Earn +100 Civic Points instantly and unlock neighborhood achievements.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">3.</span>
                <span>Submit regular check-ins with photo proof to earn +15 Points each time.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckinModal && (
        <Modal
          isOpen={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          title="Submit Periodic Check-in"
          size="md"
        >
          <form onSubmit={handleCheckin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Actions Completed During This Visit:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(spot.commitment_actions || ['Litter cleanup', 'Plant watering', 'Asset check']).map((act) => {
                  const checked = completedActions.includes(act);
                  return (
                    <div
                      key={act}
                      onClick={() => {
                        if (checked) {
                          setCompletedActions(completedActions.filter((a) => a !== act));
                        } else {
                          setCompletedActions([...completedActions, act]);
                        }
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                        checked
                          ? 'border-primary bg-primary/10 text-foreground font-medium'
                          : 'border-border text-foreground-muted hover:bg-surface-muted'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${
                          checked ? 'bg-primary text-primary-contrast' : 'border border-border'
                        }`}
                      >
                        {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                      <span>{act}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Notes & Observations *
              </label>
              <textarea
                required
                rows={3}
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                placeholder="Describe the tasks done, condition of the spot, or issues noticed..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Photo URL / Evidence Image
              </label>
              <Input
                type="text"
                placeholder="https://images.unsplash.com/... or paste image URL"
                value={checkinPhoto}
                onChange={(e) => setCheckinPhoto(e.target.value)}
              />
            </div>

            <div className="pt-2 flex gap-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowCheckinModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={submittingCheckin}
              >
                Post Check-in (+15 Pts)
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adoption Modal */}
      {showAdoptModal && (
        <Modal
          isOpen={showAdoptModal}
          onClose={() => setShowAdoptModal(false)}
          title={`Adopt ${spot.name}`}
          size="md"
        >
          <div className="space-y-4">
            <Card className="border-amber-400/40 bg-amber-500/10 p-3 space-y-1">
              <p className="font-bold flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Award className="h-4 w-4" />
                <span>Earn +100 Civic Points</span>
              </p>
              <p className="text-[11px] text-foreground-muted leading-relaxed">
                You will be recognized on the spot map and earn points for periodic check-ins. Maximum 3 spots per citizen.
              </p>
            </Card>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Care Check-in Frequency:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['weekly', 'biweekly', 'daily'] as CareFrequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCareFrequency(f)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition min-h-[36px] ${
                      careFrequency === f
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground-muted hover:bg-surface-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowAdoptModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                isLoading={adopting}
                onClick={handleAdopt}
              >
                Pledge & Adopt (+100 Pts)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && (
        <Modal
          isOpen={showReleaseModal}
          onClose={() => setShowReleaseModal(false)}
          title="Relinquish Care of This Spot?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-foreground-muted leading-relaxed">
              This spot will become available for another citizen to adopt. You will keep any points already earned.
            </p>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Reason for Release (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Relocated to another district"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
              />
            </div>

            <div className="pt-2 flex gap-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowReleaseModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                isLoading={releasing}
                onClick={handleRelease}
              >
                Confirm Release
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Modal for Staff */}
      {showStatusModal && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title="Update Spot Status (Staff Action)"
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Target Status
              </label>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SpotStatus)}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'adopted', label: 'Adopted' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Reason / Inspection Note
              </label>
              <Input
                type="text"
                placeholder="e.g. Scheduled grass seeding and repairs"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>

            <div className="pt-2 flex gap-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                isLoading={updatingStatus}
                onClick={handleUpdateStatus}
              >
                Save Status
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

