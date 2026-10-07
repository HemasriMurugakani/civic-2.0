import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, User, MapPin, Camera, ChevronDown, Check,
  AlertTriangle, ArrowLeft, UploadCloud, X, Loader2
} from 'lucide-react';
import { NammaSidebar } from '@/components/layout/NammaSidebar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

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
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('medium');
  const [constituency, setConstituency] = useState<string>('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORIES.some((c) => c.id === cat)) {
      setSelectedCatId(cat);
    }
  }, [searchParams]);

  const selectedCat = CATEGORIES.find((c) => c.id === selectedCatId) || CATEGORIES[0];

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocationStatus('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setConstituency('Royapuram'); // Auto-detected constituency sample
        setLocationStatus('📍 Location detected (13.0827° N, 80.2707° E)');
        toast.success('Location auto-detected!');
      },
      () => {
        setLocationStatus('📍 Location set to Chennai (Demo Default)');
        setLocationCoords({ lat: 13.0827, lng: 80.2707 });
        setConstituency('Royapuram');
      }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100 font-sans">
      {/* Persistent Left Sidebar */}
      <NammaSidebar className="hidden md:flex" />

      {/* Main Form Content */}
      <main className="flex-1 max-w-4xl mx-auto p-4 sm:p-8 lg:p-10 space-y-6">
        {/* Title Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Report an issue
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Choose what is wrong, add a photo and publish it for community verification.
          </p>
        </div>

        {/* Notice 1: Independent Civic Platform Disclaimer */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Shield className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="leading-relaxed">
            <strong>NammaTN</strong> is an independent civic platform, not a government grievance portal. Reports are classified for public tracking and are not sent to or acknowledged by any department, Minister, MLA or their offices.
          </p>
        </div>

        {/* Notice 2: Anonymous Report Status */}
        <div className="rounded-2xl border border-orange-200/90 bg-orange-50/70 dark:border-orange-900/60 dark:bg-orange-950/30 p-4 text-xs text-orange-950 dark:text-orange-200 flex items-start gap-3">
          <User className="h-4 w-4 shrink-0 text-orange-600 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold">
              {user ? `Signed in as ${user.name}` : "You're not signed in — your report will be anonymous."}
            </p>
            {!user && (
              <p className="text-stone-600 dark:text-stone-300 mt-0.5">
                Anonymous reports count but can&apos;t be followed up.{' '}
                <Link to="/login" className="font-bold text-[#800000] dark:text-rose-400 hover:underline">
                  Sign in to track your report.
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: 20 Categories Selector (Image 1)
        ========================================================================= */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-7 shadow-2xs space-y-4">
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            What&apos;s the problem? <span className="text-rose-600">*</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCatId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'border-[#800000] bg-rose-50/70 dark:border-rose-400 dark:bg-rose-950/40 shadow-xs ring-1 ring-[#800000]'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50/60'
                  }`}
                >
                  <span className="text-2xl mb-1.5">{cat.icon}</span>
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      isSelected
                        ? 'text-[#800000] dark:text-rose-300 font-bold'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: Detailed Form For Selected Category (Image 2)
        ========================================================================= */}
        <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-6">
          {/* Classification Header Banner */}
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4 text-xs">
            <span className="text-stone-500">
              Public classification:{' '}
              <strong className="text-stone-900 dark:text-white font-bold">
                {selectedCat.deptName}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
              className="text-[#800000] dark:text-rose-400 font-bold hover:underline"
            >
              Change
            </button>
          </div>

          {/* Dynamic Category Specific Inputs */}
          {selectedCatId === 'roads' && (
            <div className="space-y-4">
              {/* Type of road dropdown */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Type of road <span className="text-stone-400 font-normal">optional</span>
                </label>
                <div className="relative">
                  <select
                    value={roadType}
                    onChange={(e) => setRoadType(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000] appearance-none"
                  >
                    <option value="National highway">National highway</option>
                    <option value="State highway">State highway</option>
                    <option value="Corporation road">Corporation road</option>
                    <option value="Panchayat road">Panchayat road</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-stone-400 leading-normal">
                  Helps classify the report for public reference — highways are associated with the Highways department; town streets with the municipality. NammaTN does not send it to either office.
                </p>
              </div>

              {/* Type of damage dropdown */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Type of damage <span className="text-stone-400 font-normal">optional</span>
                </label>
                <div className="relative">
                  <select
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000] appearance-none"
                  >
                    <option value="Pothole">Pothole</option>
                    <option value="Waterlogging / flooding">Waterlogging / flooding</option>
                    <option value="Cave-in">Cave-in</option>
                    <option value="Broken divider">Broken divider</option>
                    <option value="Unfinished road work">Unfinished road work</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Title <span className="text-stone-400 font-normal">optional — we&apos;ll add one if you skip it</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Large pothole on Anna Salai near bus stop"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          {/* Collapsible toggle: Add more details */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <span>• Add more details — description, area, severity</span>
            </button>

            {showMoreDetails && (
              <div className="mt-3 space-y-3 p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe specific details, landmarks, or danger to vehicles/pedestrians..."
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Severity Level
                  </label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high', 'critical'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSeverity(lvl)}
                        className={`px-3 py-1 rounded-lg text-xs capitalize font-semibold transition ${
                          severity === lvl
                            ? 'bg-[#800000] text-white'
                            : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-600'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Where is it? <span className="text-rose-600">*</span>
            </label>
            <p className="text-[11px] text-stone-400">
              Share your location to auto-detect your district & constituency, or pick your constituency below.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 transition shadow-2xs"
              >
                <MapPin className="h-4 w-4 text-rose-600" />
                <span>Use my current location</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocationCoords({ lat: 13.0827, lng: 80.2707 });
                  setLocationStatus('📍 Pinned on map: Royapuram (13.0827, 80.2707)');
                  toast.info('Pin placed on map');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 transition shadow-2xs"
              >
                <span className="text-rose-600">📍</span>
                <span>Pick / adjust on map</span>
              </button>
            </div>

            {locationStatus && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {locationStatus}
              </p>
            )}
          </div>

          {/* Assembly constituency dropdown */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Assembly constituency <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <select
                value={constituency}
                onChange={(e) => setConstituency(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000] appearance-none"
              >
                <option value="">— Select your constituency —</option>
                {CONSTITUENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Photo Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Photo <span className="text-stone-400 font-normal">optional · JPEG / PNG / WebP / GIF · max 10 MB</span>
            </label>

            {photoPreview ? (
              <div className="relative w-40 h-28 rounded-2xl overflow-hidden border border-stone-200">
                <img src={photoPreview} alt="Evidence preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-stone-900/70 text-white hover:bg-stone-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-6 cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                <Camera className="h-4 w-4 text-stone-400" />
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  Choose a photo
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

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
            <Link
              to="/issues"
              className="text-xs font-semibold text-[#800000] dark:text-rose-400 hover:underline"
            >
              View all issues
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#800000] hover:bg-[#680000] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:scale-102 active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{user ? 'Submit report' : 'Submit anonymously'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
