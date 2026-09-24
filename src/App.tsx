
import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageProvider';
import { DepartmentProvider } from './components/department/DepartmentContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layouts/DashboardLayout';

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
import KeyboardShortcuts from './components/common/KeyboardShortcuts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

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
                        
                        {/* Admin Department specific dashboard */}
                        <Route path="admin-department" element={
                          <ProtectedRoute allowedRoles={['AdminDepartment']}>
                            <AdminDepartmentDashboard />
                          </ProtectedRoute>
                        } />
                        
                        {/* Audit Trail route - Admin & Director */}
                        <Route path="audit-trail" element={
                          <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                            <AuditTrailPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Department routes */}
                        <Route path="departments" element={
                          <ProtectedRoute allowedRoles={['Admin', 'Director']}>
                            <DepartmentsPage />
                          </ProtectedRoute>
                        } />
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
                        
                        {/* User routes */}
                        <Route path="users" element={
                          <ProtectedRoute>
                            <UsersPage />
                          </ProtectedRoute>
                        } />
                        <Route path="users/create" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                            <CreateUser />
                          </ProtectedRoute>
                        } />
                        <Route path="users/edit/:id" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                            <EditUser />
                          </ProtectedRoute>
                        } />
                        
                        {/* Document routes */}
                        <Route path="incoming-documents" element={
                          <ProtectedRoute>
                            <IncomingDocumentsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="incoming-documents/create" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                            <CreateIncomingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="incoming-documents/:id" element={
                          <ProtectedRoute>
                            <ViewIncomingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="incoming-documents/:id/edit" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                            <EditIncomingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="outgoing-documents" element={
                          <ProtectedRoute>
                            <OutgoingDocumentsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="outgoing-documents/create" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                            <CreateOutgoingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="outgoing-documents/:id" element={
                          <ProtectedRoute>
                            <ViewOutgoingDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="outgoing-documents/:id/edit" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminTuningDesk']}>
                            <EditOutgoingDocument />
                          </ProtectedRoute>
                        } />
                        
                        {/* Document Options route */}
                        <Route path="document-options" element={
                          <ProtectedRoute allowedRoles={['AdminTuningDesk']}>
                            <DocumentOptionsPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Templates route */}
                        <Route path="templates" element={
                          <ProtectedRoute>
                            <TemplatesPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Folder routes */}
                        <Route path="folders" element={
                          <ProtectedRoute>
                            <FoldersPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Advanced Search route */}
                        <Route path="advanced-search" element={
                          <ProtectedRoute>
                            <AdvancedSearchPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Message routes */}
                        <Route path="messages" element={
                          <ProtectedRoute>
                            <MessagesPage />
                          </ProtectedRoute>
                        } />
                        
                        {/* Settings routes - Admin only */}
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
                        
                        {/* HR Personnel routes */}
                        <Route path="hr/my-profile" element={
                          <ProtectedRoute>
                            <MyProfilePage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/my-attendance" element={
                          <ProtectedRoute>
                            <MyAttendanceCalendarPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/personnel" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <PersonnelListPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/personnel/new" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                            <PersonnelFormPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/personnel/:id" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <PersonnelDetailPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/personnel/:id/edit" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment']}>
                            <PersonnelFormPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/leave-reasons" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <LeaveReasonsManagementPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/attendance" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <AttendancePage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/attendance-declarations" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <AttendanceDeclarationsPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/all-personnel-situation" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <AllPersonnelSituationPage />
                          </ProtectedRoute>
                        } />
                        <Route path="hr/stages" element={
                          <ProtectedRoute allowedRoles={['Admin', 'AdminDepartment', 'Director']}>
                            <RHStagesPage />
                          </ProtectedRoute>
                        } />

                        {/* Organization Chart route */}
                        <Route path="organization-chart" element={<OrganizationChartPage />} />

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
