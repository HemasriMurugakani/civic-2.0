import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup
} from 'react-leaflet';
import L from 'leaflet';
import {
  Search, Filter, Plus, RefreshCw, Upload, MapPin, Calendar,
  Building2, Users, Star, AlertTriangle, CheckCircle2, Clock,
  Layers, HardHat, FileText, ChevronRight, TrendingUp, X, Check,
  AlertCircle, ShieldCheck, ArrowRight, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ProjectItem, ProjectStatus, ProjectSource } from '@/lib/types';
import { NammaSidebar } from '@/components/layout/NammaSidebar';

// Custom Map Marker for Projects
function createProjectIcon(status: string, hasAlert: boolean) {
  let color = '#3b82f6'; // in_progress blue
  if (status === 'completed') color = '#10b981'; // emerald green
  else if (status === 'delayed' || hasAlert) color = '#f59e0b'; // amber/red
  else if (status === 'planned') color = '#6b7280'; // gray

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30">
    <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
  </svg>`;

  return L.divIcon({
    className: 'custom-project-pin',
    html: svg,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

function formatBudget(amount?: number): string {
  if (!amount) return '₹ N/A';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const ProjectsTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'map' | 'table'>('cards');

  // Admin Modals
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncReport, setSyncReport] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Public Transit & Roads');
  const [newContractor, setNewContractor] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newDistrict, setNewDistrict] = useState('Chennai');
  const [newConstituency, setNewConstituency] = useState('');
  const [creating, setCreating] = useState(false);

  const isGovAdmin = user?.role === 'gov_admin';
  const isDeptAdmin = user?.role === 'dept_admin';
  const canManage = isGovAdmin || isDeptAdmin;

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedSource !== 'all') params.source = selectedSource;
      if (overdueOnly) params.overdue_only = true;

      const data = await api.getProjects(params);
      setProjects(data);
    } catch (err: any) {
      toast.error('Failed to load infrastructure projects: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, selectedCategory, selectedStatus, selectedSource, overdueOnly]);

  // Computed summary metrics
  const totalProjects = projects.length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget_amount || 0), 0);
  const inProgressCount = projects.filter((p) => p.status === 'in_progress').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const attentionCount = projects.filter((p) => p.is_delayed || p.progress_lag_alert).length;

  // Categories list
  const categories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean)));

  const handleSyncData = async () => {
    try {
      setSyncLoading(true);
      const res = await api.syncGovernmentProjects();
      setSyncReport(res);
      setShowSyncModal(true);
      toast.success(res.message);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'Open data sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleImportCsv = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file first');
      return;
    }
    try {
      setImporting(true);
      const res = await api.bulkImportProjectsCsv(importFile);
      setImportReport(res);
      toast.success(`Imported ${res.imported_count} projects successfully`);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Project title is required');
      return;
    }
    try {
      setCreating(true);
      await api.createProject({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        contractor: newContractor.trim() || undefined,
        budget_amount: newBudget ? parseFloat(newBudget) : undefined,
        district: newDistrict,
        constituency: newConstituency.trim() || undefined,
        status: 'planned',
        progress_percent: 0,
      });
      toast.success('New infrastructure project created');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewContractor('');
      setNewBudget('');
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
      {/* Namma TN Sidebar */}
      <NammaSidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto overflow-y-auto">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#800000]/10 text-[#800000] dark:bg-rose-950/60 dark:text-rose-400">
                <HardHat className="w-3.5 h-3.5" />
                Public Works & Transparency Portal
              </span>
              <span className="text-xs text-stone-400">• Tamil Nadu Open Governance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
              Infrastructure Project Tracker
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl">
              Real-time monitoring of civic capital expenditures, ground contractor progress, delay flags, and citizen community verifications across Tamil Nadu.
            </p>
          </div>

          {/* Action Buttons for Admins */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isGovAdmin && (
              <button
                onClick={handleSyncData}
                disabled={syncLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition shadow-2xs text-stone-800 dark:text-stone-200"
                title="Sync with Tamil Nadu Open Data Portal feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#800000] dark:text-rose-400 ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? 'Syncing...' : 'Sync Open Data'}</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition shadow-2xs text-stone-800 dark:text-stone-200"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Bulk Import CSV</span>
              </button>
            )}

            {canManage && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Computed Stats Metric Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>Total Projects</span>
              <Layers className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-stone-900 dark:text-white">
              {totalProjects}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Across 12 zones & wards</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>Capital Outlay</span>
              <Building2 className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-black mt-2 text-[#800000] dark:text-rose-400">
              {formatBudget(totalBudget)}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Total public allocation</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>In Execution</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black mt-2 text-blue-600 dark:text-blue-400">
              {inProgressCount}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Under active construction</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>Critical Attention</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black mt-2 text-amber-600 dark:text-amber-400">
              {attentionCount}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Overdue or &gt;25% lag</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span>Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">Fully handed over</div>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 mb-6 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, contractors, constituencies, or keywords..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl shrink-0 self-start md:self-auto">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {/* Secondary Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800/80 text-xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
              Filters:
            </span>

            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
            >
              <option value="all">All Sectors</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="delayed">Delayed</option>
              <option value="completed">Completed</option>
              <option value="planned">Planned</option>
              <option value="approved">Approved</option>
            </select>

            {/* Source */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
            >
              <option value="all">All Sources</option>
              <option value="government_data">Gov Open Data Feed</option>
              <option value="local_tracking">Local Civic Tracking</option>
            </select>

            {/* Overdue / Lag Alert Toggle */}
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition ${
                overdueOnly
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Delayed &amp; Lagging Only</span>
            </button>

            {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedSource !== 'all' || overdueOnly || search) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedSource('all');
                  setOverdueOnly(false);
                  setSearch('');
                }}
                className="text-[11px] text-stone-400 hover:text-rose-600 font-bold ml-auto"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Content based on viewMode */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin text-[#800000] mb-3" />
            <p className="text-sm font-semibold">Loading infrastructure projects database...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center">
            <HardHat className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">No Projects Found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              No infrastructure works match your selected filter criteria. Try adjusting your search keywords or reset filters.
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const isOverdue = project.is_delayed;
              const hasLagAlert = project.progress_lag_alert;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Sector & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
                        {project.category}
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {project.source === 'government_data' ? (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" /> Open Data
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                            Local Tracked
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            project.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : project.status === 'delayed'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : project.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-stone-900 dark:text-white line-clamp-2 group-hover:text-[#800000] dark:group-hover:text-rose-400 transition-colors">
                      {project.title}
                    </h3>

                    {project.description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Computed Delay / Lag Alert Pills */}
                    {(isOverdue || hasLagAlert) && (
                      <div className="mt-3 space-y-1.5">
                        {isOverdue && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Past Targeted Completion Date</span>
                          </div>
                        )}
                        {hasLagAlert && !isOverdue && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Schedule Lag: Timeline elapsed leads physical progress by &gt;25%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress Bar with Percentage */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-stone-600 dark:text-stone-400">Physical Progress</span>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {project.progress_percent}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            project.status === 'completed'
                              ? 'bg-emerald-500'
                              : isOverdue || hasLagAlert
                              ? 'bg-amber-500'
                              : 'bg-[#800000] dark:bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(project.progress_percent, 100)}%` }}
                        />
                      </div>
                      {project.time_elapsed_percent !== undefined && project.time_elapsed_percent !== null && (
                        <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                          <span>Timeline elapsed: {project.time_elapsed_percent}%</span>
                          {project.due_date && (
                            <span>Target: {new Date(project.due_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Key Attributes */}
                    <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Sanctioned Outlay:</span>
                        <span className="font-bold text-stone-900 dark:text-white">
                          {formatBudget(project.budget_amount)}
                        </span>
                      </div>
                      {project.contractor && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Contractor:</span>
                          <span className="truncate max-w-[180px] font-medium text-stone-800 dark:text-stone-200">
                            {project.contractor}
                          </span>
                        </div>
                      )}
                      {(project.ward_name || project.district) && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Location:</span>
                          <span className="text-stone-700 dark:text-stone-300 font-medium">
                            {project.ward_name || project.district}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Community & Action */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-stone-500">
                      <span className="flex items-center gap-1 font-semibold" title="Citizen Transparency Rating">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{project.transparency_rating > 0 ? project.transparency_rating.toFixed(1) : 'Unrated'}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Citizen Followers">
                        <Users className="w-3.5 h-3.5" />
                        <span>{project.followers_count}</span>
                      </span>
                      {project.linked_complaints_count > 0 && (
                        <span className="flex items-center gap-1 text-rose-600 font-semibold" title="Linked Citizen Grievances">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{project.linked_complaints_count} issues</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[#800000] dark:text-rose-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-2xs h-[650px] relative">
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
              {projects
                .filter((p) => p.latitude && p.longitude)
                .map((p) => (
                  <Marker
                    key={p.id}
                    position={[p.latitude!, p.longitude!]}
                    icon={createProjectIcon(p.status, p.is_delayed || p.progress_lag_alert)}
                  >
                    <Popup>
                      <div className="p-2 max-w-xs space-y-2">
                        <span className="text-[10px] font-bold text-[#800000] bg-rose-50 px-2 py-0.5 rounded-full">
                          {p.category}
                        </span>
                        <h4 className="text-sm font-bold text-stone-900 leading-tight">{p.title}</h4>
                        <div className="text-xs text-stone-600 space-y-1">
                          <div><strong>Status:</strong> {p.status.replace('_', ' ')}</div>
                          <div><strong>Progress:</strong> {p.progress_percent}%</div>
                          <div><strong>Budget:</strong> {formatBudget(p.budget_amount)}</div>
                          {p.contractor && <div><strong>Contractor:</strong> {p.contractor}</div>}
                        </div>
                        <button
                          onClick={() => navigate(`/projects/${p.id}`)}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#680000] transition text-center"
                        >
                          View Full Details &rarr;
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        ) : (
          /* Table View */
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 uppercase tracking-wider text-[10px] border-b border-stone-200 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">Project Title</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3">Contractor</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Community Score</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 font-bold text-stone-900 dark:text-white max-w-xs">
                        <div className="truncate">{project.title}</div>
                        {(project.is_delayed || project.progress_lag_alert) && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {project.is_delayed ? 'Overdue' : 'Lag Alert >25%'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                        {project.category}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900 dark:text-white">
                        {formatBudget(project.budget_amount)}
                      </td>
                      <td className="px-4 py-3 text-stone-500 truncate max-w-[150px]">
                        {project.contractor || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#800000] dark:bg-rose-500 rounded-full"
                              style={{ width: `${project.progress_percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-stone-800 dark:text-stone-200">
                            {project.progress_percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-600">
                        ★ {project.transparency_rating > 0 ? project.transparency_rating.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[#800000] dark:text-rose-400 font-bold hover:underline">
                          View &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Sync Report Modal */}
      {showSyncModal && syncReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Open Data Sync Completed</span>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
              <p><strong>Source:</strong> {syncReport.source_name}</p>
              <p><strong>New Records Ingested:</strong> {syncReport.records_ingested}</p>
              <p><strong>Records Updated:</strong> {syncReport.records_updated}</p>
              <p className={syncReport.conflicts_detected > 0 ? 'text-amber-600 font-bold' : ''}>
                <strong>Local Conflicts Flagged:</strong> {syncReport.conflicts_detected} (Local modifications preserved)
              </p>
              <p className="text-stone-400">Timestamp: {new Date(syncReport.synced_at).toLocaleString('en-IN')}</p>
            </div>
            <button
              onClick={() => setShowSyncModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#800000] text-white text-xs font-bold hover:bg-[#680000] transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-stone-900 dark:text-white font-bold">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Bulk Import Projects from CSV</span>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportReport(null); }} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Upload a comma-separated CSV with headers: <code>title, description, category, status, contractor, budget_amount, progress_percent, district</code>.
            </p>

            <div className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
            </div>

            {importReport && (
              <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl text-xs space-y-1">
                <p className="font-bold text-emerald-600">
                  Successfully imported: {importReport.imported_count} projects
                </p>
                {importReport.errors_count > 0 && (
                  <div>
                    <p className="text-rose-600 font-bold">Validation errors: {importReport.errors_count}</p>
                    <ul className="list-disc pl-4 text-stone-500 space-y-0.5 mt-1 max-h-24 overflow-y-auto">
                      {importReport.errors.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportReport(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={!importFile || importing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProject}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">Add Infrastructure Project</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Adyar Riverfront Promenade & Silt Basin"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Sector / Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="Public Transit & Roads">Public Transit &amp; Roads</option>
                  <option value="Drainage & Flood Mitigation">Drainage &amp; Flood Mitigation</option>
                  <option value="Water & Sewerage">Water &amp; Sewerage</option>
                  <option value="Waste Management & Sanitation">Waste Management &amp; Sanitation</option>
                  <option value="Streetlighting & Electrical">Streetlighting &amp; Electrical</option>
                  <option value="Parks & Urban Ecology">Parks &amp; Urban Ecology</option>
                  <option value="Healthcare Infrastructure">Healthcare Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Scope of works, specifications, and objectives..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Contractor / Agency</label>
                  <input
                    type="text"
                    value={newContractor}
                    onChange={(e) => setNewContractor(e.target.value)}
                    placeholder="e.g. L&T Construction"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Sanctioned Budget (INR)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="e.g. 50000000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">District</label>
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Constituency</label>
                  <input
                    type="text"
                    value={newConstituency}
                    onChange={(e) => setNewConstituency(e.target.value)}
                    placeholder="e.g. Velachery"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {creating ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
