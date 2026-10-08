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
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  EmptyState,
  Skeleton
} from '@/components/ui';

// Custom Map Markers
function createSpotPin(status: SpotStatus, spotType: SpotType) {
  let color = '#10b981';
  if (status === 'adopted') color = '#d97706';
  else if (status === 'maintenance') color = '#6b7280';

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

const TYPE_CONFIG: Record<SpotType, { label: string; icon: string; badgeVariant: 'success' | 'info' | 'warning' | 'primary' | 'secondary' }> = {
  park: { label: 'Park & Garden', icon: '🌳', badgeVariant: 'success' },
  bus_stop: { label: 'Transit Shelter', icon: '🚏', badgeVariant: 'info' },
  water_body: { label: 'Water Body / Pond', icon: '💧', badgeVariant: 'info' },
  street: { label: 'Street Median / Island', icon: '🛣️', badgeVariant: 'warning' },
  school_surroundings: { label: 'School Buffer', icon: '🏫', badgeVariant: 'primary' },
  drain: { label: 'Stormwater Drain', icon: '🌊', badgeVariant: 'info' },
  public_toilet: { label: 'Public Restroom Surroundings', icon: '🚻', badgeVariant: 'secondary' },
  other: { label: 'Civic Spot', icon: '📍', badgeVariant: 'secondary' },
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
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Adopt-a-Spot: Champion Your Local Public Spaces"
        titleTa="நம்ம ஊர் · நம்ம இடம் · தூய்மைப் பொறுப்பு"
        subtitle="Take stewardship of neighborhood parks, transit shelters, ponds, and public corners. Make a care commitment, log periodic check-ins, and earn Civic Points."
        badge={
          <Badge variant="primary" dot pulse>
            Civic Care Initiative
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <Button
                variant={activeTab === 'mine' ? 'primary' : 'outline'}
                onClick={() => setActiveTab(activeTab === 'mine' ? 'all' : 'mine')}
                leftIcon={<Heart className="h-4 w-4" />}
              >
                {activeTab === 'mine' ? 'Viewing My Adoptions' : 'My Adopted Spots'}
              </Button>
            )}

            {isAdmin && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add Spot
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRunReminders}
                  title="Run Overdue Check-in Scheduler"
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Check Cycles
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Dynamic Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Civic Spots"
          value={stats.total_spots}
          subtext="Registered public care zones"
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Available for Adoption"
          value={stats.available_spots}
          subtext="Awaiting citizen champions"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Currently Adopted"
          value={stats.adopted_spots}
          subtext="Under active neighborhood care"
          icon={<Heart className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          label="Monthly Check-ins"
          value={stats.recent_checkins}
          subtext="Verified care activities in 30d"
          icon={<Camera className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Filter and View Control Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search spots by name, landmark, or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              options={[
                { value: 'all', label: 'All Spot Types' },
                { value: 'park', label: '🌳 Parks & Gardens' },
                { value: 'bus_stop', label: '🚏 Bus Stops' },
                { value: 'water_body', label: '💧 Water Bodies' },
                { value: 'street', label: '🛣️ Streets & Medians' },
                { value: 'school_surroundings', label: '🏫 School Zones' },
                { value: 'drain', label: '🌊 Storm Drains' },
                { value: 'public_toilet', label: '🚻 Restrooms' },
              ]}
              className="w-44"
            />

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'available', label: '🟢 Available' },
                { value: 'adopted', label: '🟡 Currently Adopted' },
                { value: 'maintenance', label: '⚪ Under Maintenance' },
              ]}
              className="w-40"
            />

            <div className="inline-flex rounded-xl p-1 bg-surface-muted border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
                  viewMode === 'grid'
                    ? 'bg-surface text-foreground shadow-xs font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
                  viewMode === 'map'
                    ? 'bg-surface text-foreground shadow-xs font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      ) : spots.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8 text-foreground-muted" />}
          title="No spots found"
          description="Try adjusting your search criteria, or switch between all spots and my adoptions."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spots.map((spot) => {
            const typeInfo = TYPE_CONFIG[spot.spot_type] || TYPE_CONFIG.other;
            const isAvailable = spot.status === 'available';
            const isAdopted = spot.status === 'adopted';
            const isMySpot = user && spot.adopted_by === user.id;

            return (
              <Card
                key={spot.id}
                className="group flex flex-col p-0 overflow-hidden hover:shadow-raised transition-all duration-300"
              >
                {/* Spot Card Image */}
                <div className="relative h-44 bg-surface-muted overflow-hidden">
                  {spot.photo_url ? (
                    <img
                      src={spot.photo_url}
                      alt={spot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {typeInfo.icon}
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <Badge variant={typeInfo.badgeVariant} size="sm">
                      <span>{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={isAvailable ? 'success' : isAdopted ? 'warning' : 'secondary'}
                      size="sm"
                      dot
                    >
                      {spot.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="absolute bottom-2.5 right-3 bg-stone-950/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-300" />
                    <span className="capitalize">{spot.care_frequency} Care</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition">
                      {spot.name}
                    </h3>

                    <div className="flex items-start gap-1.5 text-xs text-foreground-muted line-clamp-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-foreground-muted mt-0.5" />
                      <span>{spot.address}</span>
                    </div>

                    {spot.description && (
                      <p className="text-xs text-foreground-muted line-clamp-2 pt-1 leading-relaxed">
                        {spot.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="pt-3 border-t border-border text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-foreground-muted">Current Caretaker:</span>
                      {isAdopted ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{isMySpot ? 'You' : spot.adopter_name || 'Active Citizen'}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          <span>Available</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-foreground-muted text-[11px]">
                      <span>Check-ins Logged:</span>
                      <span className="font-bold text-foreground">{spot.checkins_count}</span>
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
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1"
                    >
                      <Link to={`/spots/${spot.id}`}>
                        View Details
                      </Link>
                    </Button>

                    {isAvailable && (
                      <Button
                        variant="primary"
                        onClick={() => handleOpenAdoptModal(spot)}
                        leftIcon={<Heart className="h-3.5 w-3.5" />}
                      >
                        Adopt (+100 Pts)
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Interactive Leaflet Map View */
        <Card className="p-0 overflow-hidden h-[600px] relative">
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
                  <div className="p-2 max-w-xs space-y-2 text-foreground font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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

                    <h4 className="text-sm font-bold leading-tight text-foreground">{spot.name}</h4>
                    <p className="text-xs text-foreground-muted leading-snug">{spot.address}</p>

                    <div className="text-[11px] text-foreground-muted pt-1 space-y-0.5">
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
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/spots/${spot.id}`)}
                        className="flex-1 text-xs"
                      >
                        Spot Details &rarr;
                      </Button>
                      {spot.status === 'available' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenAdoptModal(spot)}
                          className="text-xs"
                        >
                          Adopt
                        </Button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      )}

      {/* Adoption Commitment Modal */}
      {spotToAdopt && (
        <Modal
          isOpen={!!spotToAdopt}
          onClose={() => setSpotToAdopt(null)}
          title={`Adopt ${spotToAdopt.name}`}
          size="lg"
        >
          <div className="space-y-5">
            <p className="text-xs text-foreground-muted">{spotToAdopt.address}</p>

            <Card className="border-amber-400/40 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-xs">
                <Award className="h-4 w-4" />
                <span>Earn +100 Civic Points instantly</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                By adopting this spot, you pledge to keep it clean, report local defects, and submit periodic check-in photos (+15 points per check-in).
                Adoptions are capped at 3 spots per citizen to keep it fair.
              </p>
            </Card>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Select Care Cadence:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['weekly', 'biweekly', 'daily'] as CareFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setCareFrequency(freq)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition min-h-[40px] ${
                      careFrequency === freq
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border text-foreground-muted hover:bg-surface-muted'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">
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
                          ? 'border-primary bg-primary/10 text-foreground font-semibold'
                          : 'border-border text-foreground-muted hover:bg-surface-muted'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          checked ? 'bg-primary text-primary-contrast' : 'border border-border'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span>{action}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  type="text"
                  placeholder="Add custom action (e.g. Paint benches)..."
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAction())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddCustomAction}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3 border-t border-border">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setSpotToAdopt(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={adopting}
                disabled={selectedActions.length === 0}
                onClick={handleConfirmAdoption}
              >
                Pledge & Adopt (+100 Pts)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Create Spot Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Register New Adoptable Spot"
          size="lg"
        >
          <form onSubmit={handleCreateSpot} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Spot Name
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Gandhi Nagar Park Corner"
                value={newSpotName}
                onChange={(e) => setNewSpotName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Spot Type
                </label>
                <Select
                  value={newSpotType}
                  onChange={(e) => setNewSpotType(e.target.value as SpotType)}
                  options={[
                    { value: 'park', label: 'Park' },
                    { value: 'bus_stop', label: 'Bus Stop' },
                    { value: 'water_body', label: 'Water Body' },
                    { value: 'street', label: 'Street Median' },
                    { value: 'school_surroundings', label: 'School Buffer' },
                    { value: 'drain', label: 'Storm Drain' },
                    { value: 'public_toilet', label: 'Restroom' },
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  District
                </label>
                <Input
                  type="text"
                  required
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Full Street Address & Landmark
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. 4th Main Road, Adyar, Chennai 600020"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Latitude
                </label>
                <Input
                  type="text"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Longitude
                </label>
                <Input
                  type="text"
                  value={newLng}
                  onChange={(e) => setNewLng(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Description / Care Guidelines
              </label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Key care tasks, native vegetation or safety precautions..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="pt-2 flex gap-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={creating}
              >
                Register Spot
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

