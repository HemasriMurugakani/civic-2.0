import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { AuthProvider } from './lib/auth';
import { AppLayout } from './components/layout/AppLayout';
import { RouteGuard } from './components/common/RouteGuard';

// Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { TrackComplaintPage } from './pages/public/TrackComplaintPage';
import { ReportPage } from './pages/public/ReportPage';
import { IssuesBoardPage } from './pages/public/IssuesBoardPage';
import { IssueDetailPage } from './pages/public/IssueDetailPage';
import { CitizenDashboardPage } from './pages/citizen/CitizenDashboardPage';
import { ComplaintFormPage } from './pages/citizen/ComplaintFormPage';
import { ComplaintDetailPage } from './pages/citizen/ComplaintDetailPage';
import { OfficerWorkbenchPage } from './pages/officer/OfficerWorkbenchPage';
import { DepartmentDashboardPage } from './pages/department/DepartmentDashboardPage';
import { GovernmentAdminPage } from './pages/admin/GovernmentAdminPage';
import { GisMapPage } from './pages/gis/GisMapPage';
import { LeaderboardPage } from './pages/citizen/LeaderboardPage';
import { ProjectsTrackerPage } from './pages/projects/ProjectsTrackerPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { CommunityHubPage } from './pages/community/CommunityHubPage';
import { GroupDetailPage } from './pages/community/GroupDetailPage';
import { ThreadDetailPage } from './pages/community/ThreadDetailPage';
import { EducationHubPage } from './pages/education/EducationHubPage';
import { ModuleDetailPage } from './pages/education/ModuleDetailPage';
import { CertificateVerifyPage } from './pages/education/CertificateVerifyPage';
import { SpotsExplorerPage } from './pages/spots/SpotsExplorerPage';
import { SpotDetailPage } from './pages/spots/SpotDetailPage';
import { DevUiPage } from './pages/dev/DevUiPage';
import { NotFoundPage, ForbiddenPage } from './pages/error/ErrorPages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/issues" element={<IssuesBoardPage />} />
              <Route path="/issues/:id" element={<IssueDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/track" element={<TrackComplaintPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/projects" element={<ProjectsTrackerPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/community" element={<CommunityHubPage />} />
              <Route path="/community/groups/:id" element={<GroupDetailPage />} />
              <Route path="/community/threads/:id" element={<ThreadDetailPage />} />
              <Route path="/education" element={<EducationHubPage />} />
              <Route path="/education/modules/:slug" element={<ModuleDetailPage />} />
              <Route path="/verify/:code" element={<CertificateVerifyPage />} />
              <Route path="/spots" element={<SpotsExplorerPage />} />
              <Route path="/spots/:id" element={<SpotDetailPage />} />
              <Route path="/dev/ui" element={<DevUiPage />} />

              {/* Citizen Routes */}
              <Route path="/citizen" element={<Navigate to="/dashboard" replace />} />
              <Route path="/citizen/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/officer/workbench" element={<Navigate to="/officer" replace />} />
              <Route
                path="/dashboard"
                element={
                  <RouteGuard allowedRoles={['citizen', 'gov_admin']}>
                    <CitizenDashboardPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/complaints/new"
                element={<Navigate to="/report" replace />}
              />
              <Route
                path="/complaints/:id"
                element={
                  <RouteGuard>
                    <ComplaintDetailPage />
                  </RouteGuard>
                }
              />

              {/* Officer Workbench */}
              <Route
                path="/officer"
                element={
                  <RouteGuard allowedRoles={['officer', 'dept_admin', 'gov_admin']}>
                    <OfficerWorkbenchPage />
                  </RouteGuard>
                }
              />

              {/* Department Admin */}
              <Route
                path="/department"
                element={
                  <RouteGuard allowedRoles={['dept_admin', 'gov_admin']}>
                    <DepartmentDashboardPage />
                  </RouteGuard>
                }
              />

              {/* Government Admin */}
              <Route
                path="/governance"
                element={
                  <RouteGuard allowedRoles={['gov_admin']}>
                    <GovernmentAdminPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/gis"
                element={
                  <RouteGuard allowedRoles={['gov_admin', 'dept_admin']}>
                    <GisMapPage />
                  </RouteGuard>
                }
              />
              <Route
                path="/admin"
                element={
                  <RouteGuard allowedRoles={['gov_admin']}>
                    <GovernmentAdminPage />
                  </RouteGuard>
                }
              />

              {/* Error Routes */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
