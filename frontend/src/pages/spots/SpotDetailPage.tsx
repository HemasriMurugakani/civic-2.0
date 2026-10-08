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
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-[#800000] animate-spin mx-auto" />
        <p className="text-sm text-stone-500 font-medium">Loading spot record...</p>
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-white">Spot Not Found</h2>
        <Link to="/spots" className="text-sm font-semibold text-[#800000] underline">
          &larr; Back to Adopt-a-Spot directory
        </Link>
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
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/spots"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-[#800000] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Civic Spots</span>
        </Link>

        {isStaff && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50"
          >
            Staff: Update Status
          </button>
        )}
      </div>

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-md">
        <div className="relative h-64 sm:h-80 bg-stone-100 dark:bg-stone-800 overflow-hidden">
          {spot.photo_url ? (
            <img
              src={spot.photo_url}
              alt={spot.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-900 text-6xl">
              📍
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-linear-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

          {/* Badges on Top */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-stone-900 backdrop-blur-md shadow-xs">
              <span className="capitalize">{spot.spot_type.replace('_', ' ')}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                spot.status === 'available'
                  ? 'bg-emerald-500 text-white'
                  : spot.status === 'adopted'
                  ? 'bg-amber-500 text-white'
                  : 'bg-stone-600 text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="capitalize">{spot.status}</span>
            </span>
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
        <div className="p-6 bg-stone-50/70 dark:bg-stone-900/90 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-stone-600 dark:text-stone-300">
            <div>
              <span className="text-stone-400 block text-[11px]">Check-in Cadence</span>
              <span className="font-bold capitalize">{spot.care_frequency}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Verified Check-ins</span>
              <span className="font-bold">{spot.checkins?.length || 0}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Linked Grievances</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {spot.linked_complaints?.length || 0} issues
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Report Grievance Link */}
            <Link
              to={`/report?spot_id=${spot.id}&spot_name=${encodeURIComponent(spot.name)}&address=${encodeURIComponent(spot.address)}&lat=${spot.latitude}&lng=${spot.longitude}`}
              className="py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-[#800000] dark:text-rose-200 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Report Issue at this Spot</span>
            </Link>

            {/* Adopt / Check-in CTA */}
            {isAvailable ? (
              <button
                onClick={() => setShowAdoptModal(true)}
                className="py-2.5 px-5 rounded-xl bg-[#800000] hover:bg-[#680000] text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <Heart className="h-4 w-4" />
                <span>Adopt This Spot (+100 Pts)</span>
              </button>
            ) : isAdopter || isStaff ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCheckinModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Camera className="h-4 w-4" />
                  <span>Log Care Check-in (+15 Pts)</span>
                </button>
                <button
                  onClick={() => setShowReleaseModal(true)}
                  className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                >
                  Release
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stewardship / Adopter Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Description & Commitment Actions */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xs">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              About This Spot & Guidelines
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-normal">
              {spot.description ||
                'This public location has been designated under the NammaTN Adopt-a-Spot program for citizen-led neighborhood upkeep, cleanliness monitoring, and civic pride.'}
            </p>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                Pledged Care Commitments:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(spot.commitment_actions?.length ? spot.commitment_actions : ['Litter inspection', 'Plant care & watering', 'Reporting defects']).map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs text-stone-700 dark:text-stone-300"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-stone-200 dark:border-stone-800 flex gap-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('checkins')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'checkins'
                  ? 'border-[#800000] text-[#800000] dark:text-rose-400'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Verified Check-ins ({spot.checkins?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'issues'
                  ? 'border-[#800000] text-[#800000] dark:text-rose-400'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Linked Grievances ({spot.linked_complaints?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'history'
                  ? 'border-[#800000] text-[#800000] dark:text-rose-400'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Adoption History ({spot.history?.length || 0})
            </button>
          </div>

          {/* Tab 1: Check-ins Timeline */}
          {activeTab === 'checkins' && (
            <div className="space-y-4">
              {!spot.checkins || spot.checkins.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-500">
                  No check-ins logged yet. The registered caretaker will post periodic photos and updates.
                </div>
              ) : (
                spot.checkins.map((chk) => (
                  <div
                    key={chk.id}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                          ✓
                        </div>
                        <div>
                          <span className="font-bold text-stone-900 dark:text-white">
                            {chk.user_display_name || 'Caretaker'}
                          </span>
                          <span className="text-stone-400 text-[11px] block">
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

                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                        +{chk.points_awarded} Points
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                      {chk.note}
                    </p>

                    {/* Actions Completed Chips */}
                    {chk.actions_completed && chk.actions_completed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {chk.actions_completed.map((act, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium"
                          >
                            ✓ {act}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Photo if provided */}
                    {chk.photo_url && (
                      <div className="pt-2">
                        <img
                          src={chk.photo_url}
                          alt="Checkin proof"
                          className="h-44 w-auto rounded-xl object-cover border border-stone-200 dark:border-stone-800"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Linked Grievances */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              {!spot.linked_complaints || spot.linked_complaints.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-500">
                  No grievances reported at this spot yet. Keep up the great care!
                </div>
              ) : (
                spot.linked_complaints.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] text-stone-400">
                        {comp.reference_no}
                      </span>
                      <h4 className="font-bold text-stone-900 dark:text-white">{comp.title}</h4>
                      <span className="text-[10px] text-stone-400">
                        Filed {new Date(comp.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 uppercase">
                        {comp.status}
                      </span>
                      <Link
                        to={`/issues/${comp.id}`}
                        className="text-[#800000] dark:text-rose-400 font-bold hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Adoption History Audit Log */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {!spot.history || spot.history.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-500">
                  No prior adoption history recorded.
                </div>
              ) : (
                spot.history.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold capitalize text-stone-800 dark:text-stone-200">
                        {hist.action.replace('_', ' ')}
                      </span>{' '}
                      <span className="text-stone-400">by {hist.user_display_name}</span>
                      {hist.reason && (
                        <p className="text-[11px] text-stone-500 mt-0.5">{hist.reason}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400">
                      {new Date(hist.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Adopter Information & Cadence */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#800000]" />
              <span>Stewardship Status</span>
            </h3>

            {spot.status === 'adopted' ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-amber-600" />
                    <span>{isAdopter ? 'Adopted by You' : spot.adopter_name || 'Active Citizen'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Adopted on {spot.adopted_at ? new Date(spot.adopted_at).toLocaleDateString('en-IN') : 'Recently'}
                  </p>
                </div>

                <div className="space-y-2 text-stone-600 dark:text-stone-300">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Cadence:</span>
                    <span className="font-semibold capitalize">{spot.care_frequency} Check-ins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Last Check-in:</span>
                    <span className="font-semibold">
                      {spot.last_checkin_at
                        ? new Date(spot.last_checkin_at).toLocaleDateString('en-IN')
                        : 'Pending first check-in'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Missed Cycles:</span>
                    <span className={`font-semibold ${spot.missed_checkins_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {spot.missed_checkins_count} / 3 max
                    </span>
                  </div>
                </div>

                {spot.missed_checkins_count >= 2 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 mt-0.5 shrink-0" />
                    <span>Warning: 1 more missed check-in will auto-release this spot back to the community.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p className="font-bold">Available for Citizen Adoption</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Be the local guardian for this spot and help maintain Chennai&apos;s civic green spaces.
                  </p>
                </div>

                <button
                  onClick={() => setShowAdoptModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#800000] hover:bg-[#680000] text-white font-bold text-xs shadow-sm transition"
                >
                  Adopt Spot (+100 Pts)
                </button>
              </div>
            )}
          </div>

          {/* Quick FAQ / Guidelines */}
          <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 text-xs space-y-3">
            <h4 className="font-bold text-stone-800 dark:text-stone-200">How Adopt-a-Spot Works:</h4>
            <ul className="space-y-2 text-stone-600 dark:text-stone-400 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">1.</span>
                <span>Pledge 2–3 simple care actions according to your cadence.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">2.</span>
                <span>Earn +100 Civic Points instantly and unlock neighborhood achievements.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">3.</span>
                <span>Submit regular check-ins with photo proof to earn +15 Points each time.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Care Verification</span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white">Submit Periodic Check-in</h3>
              </div>
              <button
                onClick={() => setShowCheckinModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
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
                            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 text-stone-900 dark:text-stone-100 font-medium'
                            : 'border-stone-200 dark:border-stone-800 text-stone-500'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${
                            checked ? 'bg-emerald-600 text-white' : 'border border-stone-300'
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
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Notes & Observations *
                </label>
                <textarea
                  required
                  rows={3}
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                  placeholder="Describe the tasks done, condition of the spot, or issues noticed..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#800000]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Photo URL / Evidence Image
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or paste image URL"
                  value={checkinPhoto}
                  onChange={(e) => setCheckinPhoto(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckin}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md"
                >
                  {submittingCheckin ? 'Submitting...' : 'Post Check-in (+15 Pts)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adoption Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase">Stewardship Pledge</span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white">Adopt {spot.name}</h3>
              </div>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Earn +100 Civic Points</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                You will be recognized on the spot map and earn points for periodic check-ins. Maximum 3 spots per citizen.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Care Check-in Frequency:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['weekly', 'biweekly', 'daily'] as CareFrequency[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCareFrequency(f)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                      careFrequency === f
                        ? 'border-[#800000] bg-rose-50 text-[#800000] dark:bg-rose-950/40 dark:text-rose-200'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAdoptModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adopting}
                onClick={handleAdopt}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#680000] text-white text-xs font-bold shadow-md transition"
              >
                {adopting ? 'Adopting...' : 'Pledge & Adopt (+100 Pts)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Relinquish Care of This Spot?
            </h3>
            <p className="text-xs text-stone-500">
              This spot will become available for another citizen to adopt. You will keep any points already earned.
            </p>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Reason for Release (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Relocated to another district"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReleaseModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={releasing}
                onClick={handleRelease}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {releasing ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal for Staff */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Update Spot Status (Staff Action)
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Target Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SpotStatus)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="adopted">Adopted</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Reason / Inspection Note
              </label>
              <input
                type="text"
                placeholder="e.g. Scheduled grass seeding and repairs"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleUpdateStatus}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] text-white text-xs font-bold hover:bg-[#680000]"
              >
                {updatingStatus ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
