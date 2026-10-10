
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageProvider';
import { DepartmentProvider } from './components/department/DepartmentContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layouts/DashboardLayout';
import {
  MailHubLayout,
  HRHubLayout,
  ToolsHubLayout,
  ProfileHubLayout,
  AdminHubLayout,
} from './components/layouts/HubLayouts';
import { ENABLE_REDIRECTS } from './config/routeRedirects';

// Lazy load components
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CreateDepartment from './pages/departments/CreateDepartment';
import EditDepartment from './pages/departments/EditDepartment';
import UsersPage from './pages/UsersPage';
import CreateUser from './pages/users/CreateUser';
import EditUser from './pages/users/EditUser';
import IncomingDocumentsPage from './pages/documents/IncomingDocumentsPage';
import OutgoingDocumentsPage from './pages/documents/OutgoingDocumentsPage';
import CreateIncomingDocument from './pages/documents/CreateIncomingDocument';
import CreateOutgoingDocument from './pages/documents/CreateOutgoingDocument';
import ViewIncomingDocument from './pages/documents/ViewIncomingDocument';
import ViewOutgoingDocument from './pages/documents/ViewOutgoingDocument';
import EditIncomingDocument from './pages/documents/EditIncomingDocument';
import EditOutgoingDocument from './pages/documents/EditOutgoingDocument';
import FoldersPage from './pages/folders/FolderManagementPage';
import MessagesPage from './pages/messages/MessagesPage';
import AdminDepartmentDashboard from './pages/department/AdminDepartmentDashboard';
import AdvancedSearchPage from './pages/AdvancedSearchPage';
import DocumentOptionsPage from './pages/documents/DocumentOptionsPage';
import NotFound from './pages/NotFound';
import ForbiddenPage from './pages/ForbiddenPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import AuditTrailPage from './pages/audit/AuditTrailPage';
import SettingsPage from './pages/settings/SettingsPage';
import MessageRetentionPage from './pages/settings/MessageRetentionPage';
import BackupSettingsPage from './pages/settings/BackupSettingsPage';
import PersonnelListPage from './pages/hr/PersonnelListPage';
import PersonnelFormPage from './pages/hr/PersonnelFormPage';
import PersonnelDetailPage from './pages/hr/PersonnelDetailPage';
import MyProfilePage from './pages/hr/MyProfilePage';
import LeaveReasonsManagementPage from './pages/hr/LeaveReasonsManagementPage';
import AttendancePage from './pages/hr/AttendancePage';
import AttendanceDeclarationsPage from './pages/hr/AttendanceDeclarationsPage';
import MyAttendanceCalendarPage from './pages/hr/MyAttendanceCalendarPage';
import AllPersonnelSituationPage from './pages/hr/AllPersonnelSituationPage';
import RHStagesPage from './pages/hr/RHStagesPage';
import OrganizationChartPage from './pages/organization/OrganizationChartPage';
import TrashPage from './pages/trash/TrashPage';
import SetupWizardPage from './pages/setup/SetupWizardPage';
import InstallationGuidePage from './pages/guide/InstallationGuidePage';
import KeyboardShortcuts from './components/common/KeyboardShortcuts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Ne pas retry sur 429 — évite les cascades
        if (error?.response?.status === 429) return false;
        return failureCount < 2;
      },
    },
  },
});

/** Helper pour les redirections rétrocompatibles conservant l'ID */
const RedirectWithId = ({ toPrefix, suffix = '' }: { toPrefix: string; suffix?: string }) => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`${toPrefix}/${id || ''}${suffix ? `/${suffix}` : ''}`} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>
        <Router>
          <LanguageProvider>
            <AuthProvider>
              <DepartmentProvider>
                <KeyboardShortcuts />
                <div className="min-h-screen bg-background">
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-screen">
                      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <Routes>
                      {/* Landing page as default */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      
                      {/* Setup Wizard route - Admin only */}
                      <Route path="/setup" element={
                        <ProtectedRoute allowedRoles={['Admin']}>
                          <SetupWizardPage />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }>
                        <Route index element={<DashboardPage />} />
                        
                        {/* ======================================================== */}
                        {/* NOUVELLES ROUTES HUBS (Architecture Gmail à 5 Hubs)     */}
                        {/* ======================================================== */}

                        {/* Hub 1 : البريد والمستندات (Courrier & Documents - 4 onglets) */}
                        <Route path="mail" element={<MailHubLayout />}>
                          <Route index element={<Navigate to="/dashboard/mail/incoming" replace />} />
                          <Route path="incoming" element={<IncomingDocumentsPage />} />
                          <Route path="incoming/create" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <CreateIncomingDocument />
                            </ProtectedRoute>
                          } />
                          <Route path="incoming/:id" element={<ViewIncomingDocument />} />
                          <Route path="incoming/:id/edit" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <EditIncomingDocument />
                            </ProtectedRoute>
                          } />
                          <Route path="outgoing" element={<OutgoingDocumentsPage />} />
                          <Route path="outgoing/create" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <CreateOutgoingDocument />
                            </ProtectedRoute>
                          } />
                          <Route path="outgoing/:id" element={<ViewOutgoingDocument />} />
                          <Route path="outgoing/:id/edit" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <EditOutgoingDocument />
                            </ProtectedRoute>
                          } />
                          <Route path="folders" element={<FoldersPage />} />
                          <Route path="search" element={<AdvancedSearchPage />} />
                        </Route>

                        {/* Hub 2 : الموارد البشرية (Ressources Humaines - 7 onglets) */}
                        <Route path="hr" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <HRHubLayout />
                          </ProtectedRoute>
                        }>
                          <Route index element={<Navigate to="/dashboard/hr/personnel" replace />} />
                          <Route path="personnel" element={<PersonnelListPage />} />
                          <Route path="personnel/new" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                              <PersonnelFormPage />
                            </ProtectedRoute>
                          } />
                          <Route path="personnel/create" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                              <PersonnelFormPage />
                            </ProtectedRoute>
                          } />
                          <Route path="personnel/:id" element={<PersonnelDetailPage />} />
                          <Route path="personnel/:id/edit" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                              <PersonnelFormPage />
                            </ProtectedRoute>
                          } />
                          <Route path="attendance" element={<AttendancePage />} />
                          <Route path="all-personnel-situation" element={<AllPersonnelSituationPage />} />
                          <Route path="situation" element={<AllPersonnelSituationPage />} />
                          <Route path="attendance-declarations" element={<AttendanceDeclarationsPage />} />
                          <Route path="declarations" element={<AttendanceDeclarationsPage />} />
                          <Route path="leave-reasons" element={<LeaveReasonsManagementPage />} />
                          <Route path="stages" element={<RHStagesPage />} />
                        </Route>

                        {/* Hub 3 : الأدوات (Outils & Modèles - 2 onglets) */}
                        <Route path="tools" element={<ToolsHubLayout />}>
                          <Route index element={<Navigate to="/dashboard/tools/templates" replace />} />
                          <Route path="templates" element={<TemplatesPage />} />
                          <Route path="document-options" element={
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <DocumentOptionsPage />
                            </ProtectedRoute>
                          } />
                        </Route>

                        {/* Hub 4 : الملف والحضور (Profil & Présence - 2 onglets) */}
                        <Route path="profile" element={<ProfileHubLayout />}>
                          <Route index element={<Navigate to="/dashboard/profile/my-profile" replace />} />
                          <Route path="my-profile" element={<MyProfilePage />} />
                          <Route path="my-attendance" element={<MyAttendanceCalendarPage />} />
                        </Route>

                        {/* Hub 5 : الإدارة (Administration - 6 onglets) */}
                        <Route path="admin" element={
                          <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                            <AdminHubLayout />
                          </ProtectedRoute>
                        }>
                          <Route index element={<Navigate to="/dashboard/admin/users" replace />} />
                          <Route path="users" element={<UsersPage />} />
                          <Route path="users/create" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <CreateUser />
                            </ProtectedRoute>
                          } />
                          <Route path="users/edit/:id" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <EditUser />
                            </ProtectedRoute>
                          } />
                          <Route path="departments" element={<DepartmentsPage />} />
                          <Route path="departments/create" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <CreateDepartment />
                            </ProtectedRoute>
                          } />
                          <Route path="departments/edit/:id" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <EditDepartment />
                            </ProtectedRoute>
                          } />
                          <Route path="audit-trail" element={<AuditTrailPage />} />
                          <Route path="organization-chart" element={<OrganizationChartPage />} />
                          <Route path="settings" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <SettingsPage />
                            </ProtectedRoute>
                          } />
                          <Route path="settings/message-retention" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <MessageRetentionPage />
                            </ProtectedRoute>
                          } />
                          <Route path="settings/backup" element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <BackupSettingsPage />
                            </ProtectedRoute>
                          } />
                          <Route path="guide" element={<InstallationGuidePage />} />
                        </Route>

                        {/* Admin Department specific dashboard */}
                        <Route path="admin-department" element={
                          <ProtectedRoute allowedRoles={['AdminDepartment']}>
                            <AdminDepartmentDashboard />
                          </ProtectedRoute>
                        } />
                        
                        {/* ======================================================== */}
                        {/* ROUTES ANCIENNES (Conservées pour rétrocompatibilité)    */}
                        {/* ======================================================== */}

                        {/* Audit Trail route */}
                        <Route path="audit-trail" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/audit-trail" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                              <AuditTrailPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Department routes */}
                        <Route path="departments" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/departments" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                              <DepartmentsPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="departments/create" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/departments/create" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <CreateDepartment />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="departments/edit/:id" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/admin/departments/edit" />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <EditDepartment />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* User routes */}
                        <Route path="users" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/users" replace />
                          ) : (
                            <ProtectedRoute>
                              <UsersPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="users/create" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/users/create" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <CreateUser />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="users/edit/:id" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/admin/users/edit" />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <EditUser />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Document routes */}
                        <Route path="incoming-documents" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/incoming" replace />
                          ) : (
                            <ProtectedRoute>
                              <IncomingDocumentsPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="incoming-documents/create" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/incoming/create" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <CreateIncomingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="incoming-documents/:id" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/mail/incoming" />
                          ) : (
                            <ProtectedRoute>
                              <ViewIncomingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="incoming-documents/:id/edit" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/mail/incoming" suffix="edit" />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <EditIncomingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="outgoing-documents" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/outgoing" replace />
                          ) : (
                            <ProtectedRoute>
                              <OutgoingDocumentsPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="outgoing-documents/create" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/outgoing/create" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <CreateOutgoingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="outgoing-documents/:id" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/mail/outgoing" />
                          ) : (
                            <ProtectedRoute>
                              <ViewOutgoingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="outgoing-documents/:id/edit" element={
                          ENABLE_REDIRECTS ? (
                            <RedirectWithId toPrefix="/dashboard/mail/outgoing" suffix="edit" />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                              <EditOutgoingDocument />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Document Options route */}
                        <Route path="document-options" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/tools/document-options" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['AdminTuningDesk']}>
                              <DocumentOptionsPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Templates route */}
                        <Route path="templates" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/tools/templates" replace />
                          ) : (
                            <ProtectedRoute>
                              <TemplatesPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Folder routes */}
                        <Route path="folders" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/folders" replace />
                          ) : (
                            <ProtectedRoute>
                              <FoldersPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Advanced Search route */}
                        <Route path="advanced-search" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/mail/search" replace />
                          ) : (
                            <ProtectedRoute>
                              <AdvancedSearchPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* Message routes */}
                        <Route path="messages" element={
                          <ProtectedRoute>
                            <MessagesPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Settings routes */}
                        <Route path="settings" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/settings" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <SettingsPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="settings/message-retention" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/settings/message-retention" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <MessageRetentionPage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="settings/backup" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/settings/backup" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin']}>
                              <BackupSettingsPage />
                            </ProtectedRoute>
                          )
                        } />
                        
                        {/* HR Personnel profile routes (redirection vers Hub Profile) */}
                        <Route path="hr/my-profile" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/profile/my-profile" replace />
                          ) : (
                            <ProtectedRoute>
                              <MyProfilePage />
                            </ProtectedRoute>
                          )
                        } />
                        <Route path="hr/my-attendance" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/profile/my-attendance" replace />
                          ) : (
                            <ProtectedRoute>
                              <MyAttendanceCalendarPage />
                            </ProtectedRoute>
                          )
                        } />

                        {/* Organization Chart route */}
                        <Route path="organization-chart" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/organization-chart" replace />
                          ) : (
                            <OrganizationChartPage />
                          )
                        } />

                        {/* Installation Guide route */}
                        <Route path="guide" element={
                          ENABLE_REDIRECTS ? (
                            <Navigate to="/dashboard/admin/guide" replace />
                          ) : (
                            <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                              <InstallationGuidePage />
                            </ProtectedRoute>
                          )
                        } />

                        {/* Document view alias routes */}
                        <Route path="documents/incoming/:id" element={
                          <ProtectedRoute>
                            <ViewIncomingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="documents/outgoing/:id" element={
                          <ProtectedRoute>
                            <ViewOutgoingDocument />
                          </ProtectedRoute>
                        } />

                        {/* Trash route */}
                        <Route path="trash" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk', 'AdminDepartment']}>
                            <TrashPage />
                          </ProtectedRoute>
                        } />
                      </Route>
                      
                      {/* Catch all other routes and show 404 */}
                      <Route path="/403" element={<ForbiddenPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  <Toaster position="top-right" />
                </div>
              </DepartmentProvider>
            </AuthProvider>
          </LanguageProvider>
        </Router>
      </DndProvider>
    </QueryClientProvider>
  );
}

export default App;
