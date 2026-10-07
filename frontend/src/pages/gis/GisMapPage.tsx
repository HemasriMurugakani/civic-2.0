import React, { useState, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts';
import {
  Filter, Layers, MapPin, X, AlertTriangle, Star, Clock,
  ChevronRight, ChevronLeft, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { WardHotspot, ComplaintItem, Department, Category } from '@/lib/types';
import { StatusBadge, PriorityDot } from '@/components/common/StatusBadges';

const DONUT_COLORS = ['#3b82f6', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Custom priority colored map marker
function createPriorityIcon(priority: string) {
  let color = '#3b82f6';
  if (priority === 'critical') color = '#dc2626';
  else if (priority === 'high') color = '#d97706';
  else if (priority === 'low') color = '#94a3b8';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
    <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3" fill="#ffffff"/>
  </svg>`;

  return L.divIcon({
    className: 'custom-priority-pin',
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export const GisMapPage: React.FC = () => {
  const { theme } = useAuth();

  const [wardHotspots, setWardHotspots] = useState<WardHotspot[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedWard, setSelectedWard] = useState<WardHotspot | null>(null);

  // Filters
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      api.getWardHotspots(60),
      api.getComplaints({ limit: 150 }),
      api.getDepartments(),
    ]).then(([wards, comps, depts]) => {
      setWardHotspots(wards);
      setComplaints(comps);
      setDepartments(depts);
      if (wards.length > 0) setSelectedWard(wards[0]);
    });
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    if (priorityFilter !== 'all' && c.final_priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (deptFilter !== 'all' && c.department_id !== Number(deptFilter)) return false;
    return c.latitude && c.longitude;
  });

  // Dark vs Light Mode Tile URL
  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Mini Donut Data for Selected Ward
  const donutData = selectedWard
    ? Object.entries(selectedWard.category_split).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-3xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-sm flex font-sans">
      {/* Collapsible Filter Side Panel */}
      <div
        className={`absolute top-4 left-4 z-20 flex flex-col rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-xl transition-all duration-200 overflow-hidden ${
          filterPanelOpen ? 'w-72 p-4' : 'w-10 h-10 p-2 items-center justify-center'
        }`}
      >
        {filterPanelOpen ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#800000] dark:text-rose-400" />
                GIS Spatial Filters
              </span>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-900 dark:text-white"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical (Red)</option>
                <option value="high">High (Amber)</option>
                <option value="medium">Medium (Blue)</option>
                <option value="low">Low (Stone)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-1.5 text-xs text-stone-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="assigned">Assigned</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-stone-400 block">Priority Legend</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span>Critical Risk</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>High Urgency</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>Medium Routine</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFilterPanelOpen(true)}
            className="text-stone-600 dark:text-stone-300"
            title="Open Filters"
          >
            <Filter className="h-5 w-5 text-[#800000]" />
          </button>
        )}
      </div>

      {/* Leaflet Map */}
      <div className="flex-1 h-full w-full">
        <MapContainer
          center={[13.0418, 80.2341]}
          zoom={12}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />

          {/* Ward Density Circles */}
          {wardHotspots.map((ward) => (
            <Circle
              key={ward.ward_id}
              center={[ward.centroid_lat, ward.centroid_lng]}
              radius={Math.min(ward.total_complaints * 4, 1800)}
              pathOptions={{
                color: ward.unresolved_count > 40 ? '#ef4444' : '#3b82f6',
                fillColor: ward.unresolved_count > 40 ? '#ef4444' : '#3b82f6',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => setSelectedWard(ward),
              }}
            />
          ))}

          {/* Grievance Priority Markers */}
          {filteredComplaints.slice(0, 100).map((c) => {
            if (!c.latitude || !c.longitude) return null;
            return (
              <Marker
                key={c.id}
                position={[c.latitude, c.longitude]}
                icon={createPriorityIcon(c.final_priority)}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <span className="font-mono font-bold text-[#800000]">{c.reference_no}</span>
                    <p className="font-bold text-stone-900">{c.title}</p>
                    <p className="text-stone-500">{c.ward_name}</p>
                    <div className="pt-1 flex gap-1">
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Ward Detail Summary Drawer (Right Side) */}
      {selectedWard && (
        <div className="absolute top-4 right-4 z-20 w-80 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-2xl p-5 space-y-4 max-h-[90%] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#800000] dark:text-rose-400 uppercase">
                Zone Analysis
              </span>
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {selectedWard.ward_name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedWard(null)}
              className="p-1 text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-2.5">
              <span className="text-stone-400 block text-[10px]">Total Grievances</span>
              <span className="text-base font-extrabold text-stone-900 dark:text-white">
                {selectedWard.total_complaints}
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-2.5">
              <span className="text-stone-400 block text-[10px]">Unresolved Cases</span>
              <span className="text-base font-extrabold text-amber-600">
                {selectedWard.unresolved_count}
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-2.5">
              <span className="text-stone-400 block text-[10px]">SLA Compliance</span>
              <span className="text-base font-extrabold text-emerald-600">
                {selectedWard.sla_compliance_rate}%
              </span>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-800 p-2.5">
              <span className="text-stone-400 block text-[10px]">Avg Resolution</span>
              <span className="text-base font-extrabold text-stone-900 dark:text-white">
                {selectedWard.avg_resolution_days}d
              </span>
            </div>
          </div>

          {/* Mini Donut Chart of Category Split */}
          {donutData.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                Category Split
              </span>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                    >
                      {donutData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1c1917', color: '#fff', fontSize: '10px', borderRadius: '6px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
