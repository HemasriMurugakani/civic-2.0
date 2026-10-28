import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, User, MapPin, Camera, Check,
  AlertTriangle, UploadCloud, X, Loader2, Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent,
  Button, Input, Select, Badge
} from '@/components/ui';

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  deptName: string;
  roadTypes?: string[];
  damageTypes?: string[];
}

const CATEGORIES: CategoryOption[] = [
  { id: 'roads', name: 'Roads & Potholes', icon: '🚧', deptName: 'Highways and Minor Ports Department' },
  { id: 'streetlights', name: 'Street Lights', icon: '💡', deptName: 'Municipal Administration and Water Supply' },
  { id: 'water', name: 'Water Supply', icon: '💧', deptName: 'Chennai Metro Water / TWAD Board' },
  { id: 'power', name: 'Electricity / Power', icon: '⚡', deptName: 'Energy Department (TANGEDCO)' },
  { id: 'drainage', name: 'Drainage & Sewage', icon: '〰️', deptName: 'Municipal Administration and Water Supply' },
  { id: 'garbage', name: 'Garbage & Sanitation', icon: '🗑️', deptName: 'MAWS (Rural Development & Panchayats)' },
  { id: 'health', name: 'Public Health', icon: '❤️', deptName: 'Health and Family Welfare Department' },
  { id: 'transport', name: 'Public Transport', icon: '🚌', deptName: 'Transport Department (MTC / SETC)' },
  { id: 'ration', name: 'Ration / PDS', icon: '🛒', deptName: 'Food and Consumer Protection Department' },
  { id: 'education', name: 'Schools & Education', icon: '📖', deptName: 'School Education Department' },
  { id: 'revenue', name: 'Land & Revenue Records', icon: '⛳', deptName: 'Revenue and Disaster Management' },
  { id: 'pollution', name: 'Pollution & Environment', icon: '🍃', deptName: 'Environment, Climate Change & Forests' },
  { id: 'corruption', name: 'Corruption / Bribery', icon: '⚠️', deptName: 'Directorate of Vigilance and Anti-Corruption' },
  { id: 'safety', name: 'Women & Child Safety', icon: '🛡️', deptName: 'Social Welfare & Women Empowerment' },
  { id: 'animals', name: 'Stray Animals & Menace', icon: '🐶', deptName: 'Animal Husbandry & Municipal Corp' },
  { id: 'encroachment', name: 'Encroachment & Illegal Construction', icon: '🏛️', deptName: 'Housing and Urban Development' },
  { id: 'hazards', name: 'Public Safety & Hazards', icon: '🚨', deptName: 'Police Department / Fire & Rescue' },
  { id: 'crime', name: 'Crime Reporting', icon: '🏷️', deptName: 'Tamil Nadu Police Department' },
  { id: 'heritage', name: 'Heritage & Monuments', icon: '🏛️', deptName: 'Tourism, Culture & Religious Endowments' },
  { id: 'bridges', name: 'Bridges & Flyovers', icon: '🌉', deptName: 'Highways Department' },
];

const CONSTITUENCIES = [
  'Royapuram', 'Harbour', 'Chepauk-Thiruvallikeni', 'Thousand Lights',
  'Anna Nagar', 'Virugambakkam', 'Saidapet', 'T. Nagar',
  'Mylapore', 'Velachery', 'Tambaram', 'Pallavaram',
  'Avadi', 'Poonamallee', 'Maduravoyal', 'Ambattur',
  'Sholinganallur', 'Ranipet', 'Nemili', 'Arakkonam',
  'Madurai Central', 'Madurai West', 'Coimbatore South', 'Salem North'
];

export const ReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedCatId, setSelectedCatId] = useState<string>('roads');
  const [roadType, setRoadType] = useState<string>('National highway');
  const [damageType, setDamageType] = useState<string>('Pothole');

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('medium');
  const [constituency, setConstituency] = useState<string>('Royapuram');

  const [locationStatus, setLocationStatus] = useState<string>('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState<boolean>(false);
  const [aiPriority, setAiPriority] = useState<any>(null);

  // Debounced AI Duplicate Check & Priority Prediction
  useEffect(() => {
    if (!title || title.trim().length < 5) {
      setDuplicateCandidates([]);
      setAiPriority(null);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingDuplicates(true);
      api.checkDuplicateIssue({
        title,
        description: description || title,
        latitude: locationCoords?.lat,
        longitude: locationCoords?.lng,
        threshold: 0.45,
        limit: 3,
        days_cutoff: 180,
      })
      .then((res) => {
        setDuplicateCandidates(res.candidates || []);
      })
      .catch(() => {
        setDuplicateCandidates([]);
      })
      .finally(() => {
        setCheckingDuplicates(false);
      });

      api.predictIssuePriority({
        title,
        description: description || title,
        location_text: constituency,
      })
      .then((res) => {
        setAiPriority(res);
        if (res.recommended_priority === 'CRITICAL') {
          setSeverity('critical');
        }
      })
      .catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description, locationCoords, constituency]);

  const spotIdParam = searchParams.get('spot_id');
  const spotName = searchParams.get('spot_name');
  const spotId = spotIdParam ? parseInt(spotIdParam, 10) : undefined;

  useEffect(() => {
    if (spotId && spotName) {
      setTitle(`Maintenance report: ${spotName}`);
      setDescription(`Civic maintenance report submitted for Adopt-a-Spot #${spotId} (${spotName}). Please inspect ground conditions.`);
    }
  }, [spotId, spotName]);

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCatId) || CATEGORIES[0];

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationStatus('Locating your position in Tamil Nadu...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus(`📍 Detected location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        toast.success('Location detected!');
      },
      () => {
        setLocationStatus('📍 Defaulting to Royapuram, Chennai (13.0827, 80.2707)');
        setLocationCoords({ lat: 13.0827, lng: 80.2707 });
        toast.info('Using default Royapuram location');
      }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const finalTitle = title.trim() || `${selectedCat.name}: ${damageType || 'Issue'} on ${constituency || 'Public Area'}`;
      const finalDesc = description.trim() || `Civic grievance filed under ${selectedCat.deptName}. Classification: ${roadType || 'General road'}. Damage observed: ${damageType || 'General issue'}. Area: ${constituency || 'Tamil Nadu'}.`;

      const res = await api.createPublicIssue({
        title: finalTitle,
        description: finalDesc,
        category_code: selectedCat.id,
        constituency: constituency || 'Royapuram',
        road_type: roadType,
        damage_type: damageType,
        severity: severity,
        latitude: locationCoords?.lat || 13.0827,
        longitude: locationCoords?.lng || 80.2707,
        is_anonymous: !user,
        spot_id: spotId || undefined,
      });

      toast.success('Report submitted successfully!');
      if (res.id) {
        navigate(`/issues/${res.id}`);
      } else {
        navigate('/issues');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Report an issue"
        subtitle="Choose what is wrong, add a photo and publish it for community verification."
        breadcrumbs={[
          { label: 'Portal', href: '/issues' },
          { label: 'File Grievance' }
        ]}
      />

      {spotId && (
        <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                  Reporting Issue for Adopted Spot: {spotName || `#${spotId}`}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  This report will be tagged and tracked on the spot&apos;s maintenance record.
                </p>
              </div>
            </div>
            <Link
              to={`/spots/${spotId}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition shrink-0 self-start sm:self-auto min-h-[36px] flex items-center"
            >
              View Spot
            </Link>
          </div>
        </Card>
      )}

      {/* Disclaimers & Auth notice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
          <Shield className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="leading-relaxed">
            <strong>NammaNagar</strong> is an independent civic platform. Reports are classified for public community tracking.
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200/90 bg-orange-50/70 dark:border-orange-900/60 dark:bg-orange-950/30 p-3.5 text-xs text-orange-950 dark:text-orange-200 flex items-start gap-2.5 shadow-2xs">
          <User className="h-4 w-4 shrink-0 text-orange-600 mt-0.5" />
          <p className="leading-relaxed">
            {user ? (
              <>Signed in as <strong>{user.name}</strong></>
            ) : (
              <>
                Anonymous report.{' '}
                <Link to="/login" className="font-bold text-[#800000] dark:text-rose-400 hover:underline">
                  Sign in to track.
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Category Picker Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">
            What&apos;s the problem? <span className="text-rose-600">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCatId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex flex-col items-start p-3 sm:p-3.5 rounded-2xl border text-left transition-all min-h-[72px] ${
                    isSelected
                      ? 'border-[#800000] bg-rose-50/80 dark:border-rose-600 dark:bg-rose-950/50 shadow-2xs ring-2 ring-[#800000]/10'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <span className="text-xl mb-1.5">{cat.icon}</span>
                  <span
                    className={`text-xs font-bold leading-snug line-clamp-2 ${
                      isSelected ? 'text-[#800000] dark:text-rose-300' : 'text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Details Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">Grievance Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Headline / Brief Summary"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Large pothole on Anna Salai near bus stop"
            />

            {/* AI Semantic Duplicate Detection Alert */}
            {checkingDuplicates && (
              <div className="flex items-center gap-2 text-xs text-stone-500 italic py-1 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#800000] dark:text-rose-400" />
                <span>Checking locality for duplicate reports with AI embeddings...</span>
              </div>
            )}

            {duplicateCandidates.length > 0 && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 p-3.5 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>AI Duplicate Detection: {duplicateCandidates.length} similar issue(s) reported nearby</span>
                  </div>
                  <Badge variant="warning" size="sm">
                    {Math.round(duplicateCandidates[0].composite_score * 100)}% match
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {duplicateCandidates.map((cand) => (
                    <div
                      key={cand.complaint_id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/80 dark:border-amber-900/40 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-stone-900 dark:text-stone-100 block truncate">
                          {cand.title}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 block truncate">
                          {cand.reference_no} · {cand.ward_name} · {Math.round(cand.composite_score * 100)}% similarity
                          {cand.distance_meters !== null && cand.distance_meters !== undefined ? ` · ${cand.distance_meters}m away` : ''}
                        </span>
                      </div>
                      <Link
                        to={`/track/${cand.reference_no}`}
                        target="_blank"
                        className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline shrink-0"
                      >
                        View & Upvote ↗
                      </Link>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  💡 <strong>Tip:</strong> Upvoting an existing report increases its civic consensus priority and guarantees SLA accountability without creating duplicate tickets for the field team.
                </p>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[36px]"
              >
                <span>• {showMoreDetails ? 'Hide extra details' : 'Add more details — description, severity'}</span>
              </button>

              {showMoreDetails && (
                <div className="mt-3 space-y-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Full Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe specific landmarks, hazards to motorists, or local ward context..."
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Severity Level
                      </label>
                      {aiPriority && (
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                          <Sparkles className="h-3 w-3" />
                          <span>AI Suggests: <strong className="uppercase">{aiPriority.recommended_priority}</strong> ({Math.round(aiPriority.urgency_score * 100)}% urgency)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['low', 'medium', 'high', 'critical'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSeverity(lvl)}
                          className={`px-3 py-1.5 rounded-xl text-xs capitalize font-semibold transition min-h-[36px] ${
                            severity === lvl
                              ? 'bg-[#800000] dark:bg-rose-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    {aiPriority?.hazard_signals?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Detected Hazard Signals</span>
                        <div className="flex flex-wrap gap-1.5">
                          {aiPriority.hazard_signals.map((sig: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                              ⚠️ {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Location & Constituency <span className="text-rose-600">*</span>
              </label>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<MapPin className="h-4 w-4 text-rose-600" />}
                  onClick={handleUseCurrentLocation}
                >
                  Use my current location
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<span>📍</span>}
                  onClick={() => {
                    setLocationCoords({ lat: 13.0827, lng: 80.2707 });
                    setLocationStatus('📍 Pinned on map: Royapuram (13.0827, 80.2707)');
                    toast.info('Pin placed on map');
                  }}
                >
                  Pick on map
                </Button>
              </div>

              {locationStatus && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {locationStatus}
                </p>
              )}
            </div>

            <Select
              label="Assembly constituency"
              required
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              options={CONSTITUENCIES.map((c) => ({ value: c, label: c }))}
            />

            {/* Photo upload */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Photo Evidence <span className="text-stone-400 font-normal">(optional · JPEG/PNG/WebP max 10MB)</span>
              </label>

              {photoPreview ? (
                <div className="relative w-44 h-32 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700">
                  <img src={photoPreview} alt="Evidence preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-6 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition min-h-[100px]">
                  <Camera className="h-5 w-5 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Choose a photo or drag image here
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2">
          <Link
            to="/issues"
            className="text-xs font-semibold text-[#800000] dark:text-rose-400 hover:underline min-h-[44px] flex items-center"
          >
            ← View all issues
          </Link>

          <Button
            type="submit"
            size="md"
            isLoading={submitting}
            className="min-h-[44px] px-6"
          >
            {user ? 'Submit report' : 'Submit anonymously'}
          </Button>
        </div>
      </form>
    </div>
  );
};
