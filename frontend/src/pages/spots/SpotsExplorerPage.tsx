import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Calendar, CheckCircle2, Heart, ShieldCheck, Layers,
  Search, Plus, RefreshCw, SlidersHorizontal, Camera, AlertTriangle,
  Sparkles, Clock, ArrowRight, ExternalLink, FileText, Award, Info,
  Check, X, ChevronRight, UserCheck
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  SpotListItem, SpotType, SpotStatus, CareFrequency, SpotListResponse
} from '@/lib/types';
import { toast } from 'sonner';

// Custom Map Markers
function createSpotPin(status: SpotStatus, spotType: SpotType) {
  let color = '#10b981'; // green for available
  if (status === 'adopted') color = '#d97706'; // amber/gold for adopted
  else if (status === 'maintenance') color = '#6b7280'; // gray

  const typeIcons: Record<string, string> = {
    park: '🌳',
    bus_stop: '🚏',
    water_body: '💧',
    street: '🛣️',
    school_surroundings: '🏫',
    drain: '🌊',
    public_toilet: '🚻',
    other: '📍',
  };

  const iconText = typeIcons[spotType] || '📍';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
    <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 2C8.27 2 2 8.27 2 16c0 10.5 14 24 14 24s14-13.5 14-24c0-7.73-6.27-14-14-14z"/>
    <circle cx="16" cy="16" r="10" fill="#ffffff"/>
    <text x="16" y="20" font-size="12" text-anchor="middle" font-family="sans-serif">${iconText}</text>
  </svg>`;

  return L.divIcon({
    className: 'custom-spot-pin',
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

const TYPE_CONFIG: Record<SpotType, { label: string; icon: string; bg: string; text: string }> = {
  park: { label: 'Park & Garden', icon: '🌳', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
  bus_stop: { label: 'Transit Shelter', icon: '🚏', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
  water_body: { label: 'Water Body / Pond', icon: '💧', bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300' },
  street: { label: 'Street Median / Island', icon: '🛣️', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
  school_surroundings: { label: 'School Buffer', icon: '🏫', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300' },
  drain: { label: 'Stormwater Drain', icon: '🌊', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300' },
  public_toilet: { label: 'Public Restroom Surroundings', icon: '🚻', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300' },
  other: { label: 'Civic Spot', icon: '📍', bg: 'bg-stone-50 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300' },
};

const DEFAULT_COMMITMENT_ACTIONS = [
  'Regular litter cleanup & segregation',
  'Watering saplings & shrub pruning',
  'Weeding and pathway sweep',
  'Reporting civic defects & broken assets',
  'Community awareness advocacy'
];

export const SpotsExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [spots, setSpots] = useState<SpotListItem[]>([]);
  const [stats, setStats] = useState({
    total_spots: 0,
    available_spots: 0,
    adopted_spots: 0,
    recent_checkins: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Adoption Modal State
  const [spotToAdopt, setSpotToAdopt] = useState<SpotListItem | null>(null);
  const [careFrequency, setCareFrequency] = useState<CareFrequency>('weekly');
  const [selectedActions, setSelectedActions] = useState<string[]>(DEFAULT_COMMITMENT_ACTIONS.slice(0, 3));
  const [customAction, setCustomAction] = useState('');
  const [adopting, setAdopting] = useState(false);

  // Admin Create Spot Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotType, setNewSpotType] = useState<SpotType>('park');
  const [newAddress, setNewAddress] = useState('');
  const [newDistrict, setNewDistrict] = useState('Chennai');
  const [newLat, setNewLat] = useState('13.0827');
  const [newLng, setNewLng] = useState('80.2707');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const isStaff = user?.role === 'gov_admin' || user?.role === 'dept_admin' || user?.role === 'officer';
  const isAdmin = user?.role === 'gov_admin' || user?.role === 'dept_admin';

  const fetchSpots = async () => {
    try {
      setLoading(true);
      if (activeTab === 'mine') {
        const res = await api.getMyAdoptedSpots();
        setSpots(res.items || []);
        if (res.stats) setStats(res.stats);
      } else {
        const res = await api.getSpots({
          search: search.trim() || undefined,
          spot_type: selectedType !== 'all' ? selectedType : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          limit: 50,
        });
        setSpots(res.items || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load civic spots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, [search, selectedType, selectedStatus, activeTab]);

  const handleOpenAdoptModal = (spot: SpotListItem) => {
    if (!user) {
      toast.error('Please sign in to adopt a civic spot');
      navigate('/login');
      return;
    }
    setSpotToAdopt(spot);
    setSelectedActions(DEFAULT_COMMITMENT_ACTIONS.slice(0, 3));
    setCareFrequency(spot.care_frequency || 'weekly');
  };

  const handleToggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      if (selectedActions.length === 1) {
        toast.error('Please choose at least one care commitment');
        return;
      }
      setSelectedActions(selectedActions.filter((a) => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  const handleAddCustomAction = () => {
    if (!customAction.trim()) return;
    if (!selectedActions.includes(customAction.trim())) {
      setSelectedActions([...selectedActions, customAction.trim()]);
    }
    setCustomAction('');
  };

  const handleConfirmAdoption = async () => {
    if (!spotToAdopt) return;
    try {
      setAdopting(true);
      await api.adoptSpot(spotToAdopt.id, {
        commitment_actions: selectedActions,
        care_frequency: careFrequency,
      });
      toast.success(`🎉 You adopted ${spotToAdopt.name}! +100 Civic Points awarded.`);
      setSpotToAdopt(null);
      fetchSpots();
    } catch (err: any) {
      toast.error(err.message || 'Could not complete adoption');
    } finally {
      setAdopting(false);
    }
  };

  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.bulkCreateSpots([
        {
          name: newSpotName,
          spot_type: newSpotType,
          address: newAddress,
          district: newDistrict,
          latitude: parseFloat(newLat) || 13.0827,
          longitude: parseFloat(newLng) || 80.2707,
          description: newDescription || undefined,
          care_frequency: 'weekly',
          commitment_actions: ['Litter clearance', 'Monitoring & reporting'],
        },
      ]);
      toast.success('Spot created successfully!');
      setShowCreateModal(false);
      setNewSpotName('');
      setNewAddress('');
      fetchSpots();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create spot');
    } finally {
      setCreating(false);
    }
  };

  const handleRunReminders = async () => {
    try {
      const res = await api.runSpotReminders();
      toast.success(`Scheduler finished: ${res.reminders_sent} reminders sent, ${res.auto_released_count} spots auto-released.`);
      fetchSpots();
    } catch (err: any) {
      toast.error(err.message || 'Failed to run scheduler');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#800000] via-[#5c0000] to-[#380000] p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md border border-white/15 text-amber-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>TAMIL NADU CIVIC CARE INITIATIVE • ADOPT-A-SPOT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Champion Your Local Public Spaces
          </h1>

          <p className="text-sm sm:text-base text-rose-100/90 leading-relaxed font-normal">
            Take stewardship of neighborhood parks, transit bus shelters, lakes, and street corners.
            Make a short care commitment, log periodic check-ins, earn Civic Points, and build vibrant, cleaner communities.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            {user && (
              <button
                onClick={() => setActiveTab(activeTab === 'mine' ? 'all' : 'mine')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-sm ${
                  activeTab === 'mine'
                    ? 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                }`}
              >
                <Heart className="h-4 w-4 text-amber-300" />
                <span>{activeTab === 'mine' ? 'Viewing My Adoptions' : 'My Adopted Spots'}</span>
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#800000] font-bold text-xs hover:bg-rose-50 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Adoptable Spot</span>
                </button>
                <button
                  onClick={handleRunReminders}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 transition"
                  title="Run Overdue Check-in Scheduler"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Check Overdue Cycles</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Decorative corner pattern */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Dynamic Statistics Bar (computed from DB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold mb-2">
            <span>Total Civic Spots</span>
            <Layers className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
            {stats.total_spots}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            Registered public care zones
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
            <span>Available for Adoption</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.available_spots}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            Awaiting citizen champions
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold mb-2">
            <span>Currently Adopted</span>
            <Heart className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.adopted_spots}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            Under active neighborhood care
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#800000] dark:text-rose-400 text-xs font-semibold mb-2">
            <span>Monthly Check-ins</span>
            <Camera className="h-4 w-4 text-[#800000] dark:text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#800000] dark:text-rose-400">
            {stats.recent_checkins}
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
            Care activities verified in 30 days
          </p>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search spots by name, landmark, or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          {/* Type Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#800000]"
            >
              <option value="all">All Spot Types</option>
              <option value="park">🌳 Parks & Gardens</option>
              <option value="bus_stop">🚏 Bus Stops</option>
              <option value="water_body">💧 Water Bodies</option>
              <option value="street">🛣️ Streets & Medians</option>
              <option value="school_surroundings">🏫 School Zones</option>
              <option value="drain">🌊 Storm Drains</option>
              <option value="public_toilet">🚻 Restrooms</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#800000]"
            >
              <option value="all">All Statuses</option>
              <option value="available">🟢 Available for Adoption</option>
              <option value="adopted">🟡 Currently Adopted</option>
              <option value="maintenance">⚪ Under Maintenance</option>
            </select>

            {/* View Switch */}
            <div className="inline-flex rounded-xl p-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Interactive Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-[#800000] animate-spin mx-auto" />
          <p className="text-sm text-stone-500 font-medium">Loading civic spots...</p>
        </div>
      ) : spots.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center space-y-3 bg-white dark:bg-stone-900/50">
          <MapPin className="h-10 w-10 text-stone-300 dark:text-stone-700 mx-auto" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">No spots found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search criteria, or switch to viewing all spots.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spots.map((spot) => {
            const typeInfo = TYPE_CONFIG[spot.spot_type] || TYPE_CONFIG.other;
            const isAvailable = spot.status === 'available';
            const isAdopted = spot.status === 'adopted';
            const isMySpot = user && spot.adopted_by === user.id;

            return (
              <div
                key={spot.id}
                className="group flex flex-col bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Spot Card Image / Visual */}
                <div className="relative h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  {spot.photo_url ? (
                    <img
                      src={spot.photo_url}
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-900 text-4xl">
                      {typeInfo.icon}
                    </div>
                  )}

                  {/* Badges on Image */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-2xs ${typeInfo.bg} ${typeInfo.text}`}>
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                        isAvailable
                          ? 'bg-emerald-500 text-white'
                          : isAdopted
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-600 text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{spot.status.replace('_', ' ').toUpperCase()}</span>
                    </span>
                  </div>

                  {/* Frequency badge at bottom right */}
                  <div className="absolute bottom-2.5 right-3 bg-stone-950/70 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-300" />
                    <span className="capitalize">{spot.care_frequency} Care</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-stone-900 dark:text-white line-clamp-1 group-hover:text-[#800000] transition">
                      {spot.name}
                    </h3>

                    <div className="flex items-start gap-1.5 text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400 mt-0.5" />
                      <span>{spot.address}</span>
                    </div>

                    {spot.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 pt-1 font-normal leading-relaxed">
                        {spot.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
                      <span className="text-[11px] text-stone-400">Current Caretaker:</span>
                      {isAdopted ? (
                        <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{isMySpot ? 'You' : spot.adopter_name || 'Active Citizen'}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Available</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-stone-400 text-[11px]">
                      <span>Check-ins Logged:</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{spot.checkins_count}</span>
                    </div>

                    {spot.linked_complaints_count > 0 && (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-[11px]">
                        <span>Linked Reports:</span>
                        <span className="font-bold">{spot.linked_complaints_count} issues</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-2 flex items-center gap-2">
                    <Link
                      to={`/spots/${spot.id}`}
                      className="flex-1 py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-50 dark:hover:bg-stone-800 transition text-center"
                    >
                      View Details
                    </Link>

                    {isAvailable && (
                      <button
                        onClick={() => handleOpenAdoptModal(spot)}
                        className="py-2 px-3.5 rounded-xl bg-[#800000] text-white text-xs font-bold hover:bg-[#680000] transition flex items-center gap-1 shadow-xs"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        <span>Adopt (+100 Pts)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Interactive Leaflet Map View */
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-md h-[650px] relative">
          <MapContainer
            center={[13.04, 80.24]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            className="z-10"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {spots.map((spot) => (
              <Marker
                key={spot.id}
                position={[spot.latitude, spot.longitude]}
                icon={createSpotPin(spot.status, spot.spot_type)}
              >
                <Popup>
                  <div className="p-2 max-w-xs space-y-2 text-stone-900 font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-[#800000]">
                        {spot.spot_type.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                          spot.status === 'available' ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      >
                        {spot.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold leading-tight text-stone-900">{spot.name}</h4>
                    <p className="text-xs text-stone-600 leading-snug">{spot.address}</p>

                    <div className="text-[11px] text-stone-500 pt-1 space-y-0.5">
                      <div>
                        <strong>Caretaker:</strong> {spot.adopter_name || (spot.status === 'available' ? 'Open for adoption' : 'Registered citizen')}
                      </div>
                      <div>
                        <strong>Care Cadence:</strong> {spot.care_frequency}
                      </div>
                      <div>
                        <strong>Check-ins:</strong> {spot.checkins_count} verified
                      </div>
                    </div>

                    <div className="pt-2 flex gap-1.5">
                      <button
                        onClick={() => navigate(`/spots/${spot.id}`)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#680000] transition text-center"
                      >
                        Spot Details &rarr;
                      </button>
                      {spot.status === 'available' && (
                        <button
                          onClick={() => handleOpenAdoptModal(spot)}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                        >
                          Adopt
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Adoption Commitment Modal */}
      {spotToAdopt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Care Commitment
                </span>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white leading-tight">
                  Adopt {spotToAdopt.name}
                </h3>
                <p className="text-xs text-stone-500">{spotToAdopt.address}</p>
              </div>
              <button
                onClick={() => setSpotToAdopt(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Explainer Box */}
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 text-xs text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Earn +100 Civic Points instantly</span>
              </div>
              <p className="leading-relaxed">
                By adopting this spot, you pledge to keep it clean, report local defects, and submit periodic check-in photos (+15 points per check-in).
                Adoptions are capped at 3 spots per citizen to keep it fair.
              </p>
            </div>

            {/* Care Frequency Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Select Care Cadence:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['weekly', 'biweekly', 'daily'] as CareFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setCareFrequency(freq)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                      careFrequency === freq
                        ? 'border-[#800000] bg-rose-50 text-[#800000] dark:bg-rose-950/40 dark:text-rose-200'
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Commitment Checklist */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Your Pledged Care Actions:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {DEFAULT_COMMITMENT_ACTIONS.map((action) => {
                  const checked = selectedActions.includes(action);
                  return (
                    <div
                      key={action}
                      onClick={() => handleToggleAction(action)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-xs transition ${
                        checked
                          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30 text-stone-900 dark:text-stone-100'
                          : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          checked ? 'bg-emerald-600 text-white' : 'border border-stone-300'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="font-medium">{action}</span>
                    </div>
                  );
                })}
              </div>

              {/* Add custom action */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom action (e.g. Paint benches)..."
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAction())}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-hidden focus:ring-1 focus:ring-[#800000]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAction}
                  className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-bold text-stone-700 dark:text-stone-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSpotToAdopt(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adopting || selectedActions.length === 0}
                onClick={handleConfirmAdoption}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#800000] hover:bg-[#680000] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {adopting ? 'Registering Adoption...' : 'Pledge & Adopt (+100 Pts)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Create Spot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900 dark:text-white">
                Register New Adoptable Spot
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSpot} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Spot Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gandhi Nagar Park Corner"
                  value={newSpotName}
                  onChange={(e) => setNewSpotName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#800000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Spot Type
                  </label>
                  <select
                    value={newSpotType}
                    onChange={(e) => setNewSpotType(e.target.value as SpotType)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#800000]"
                  >
                    <option value="park">Park</option>
                    <option value="bus_stop">Bus Stop</option>
                    <option value="water_body">Water Body</option>
                    <option value="street">Street Median</option>
                    <option value="school_surroundings">School Buffer</option>
                    <option value="drain">Storm Drain</option>
                    <option value="public_toilet">Restroom</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Full Street Address & Landmark
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4th Main Road, Adyar, Chennai 600020"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Description / Care Guidelines
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Key care tasks, native vegetation or safety precautions..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-[#800000] text-white text-xs font-bold hover:bg-[#680000]"
                >
                  {creating ? 'Creating...' : 'Register Spot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
