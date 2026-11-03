import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/common/Layout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ActivateAccountPage } from './pages/ActivateAccountPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { ParentsPage } from './pages/ParentsPage';
import { StaffPage } from './pages/StaffPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { AttendancePage } from './pages/AttendancePage';
import { FeesPage } from './pages/FeesPage';
import { ExaminationsPage } from './pages/ExaminationsPage';
import { TimetablePage } from './pages/TimetablePage';
import { LeaveManagementPage } from './pages/LeaveManagementPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { UsersPage } from './pages/UsersPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Role } from './types';
import { getRoleDashboardPath } from './utils/navigation';
import { GraduationCap } from 'lucide-react';

// Protected Route wrapper with RBAC check
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Role[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl animate-pulse">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Initializing EDUNEX Academic Management Platform...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route wrapper (redirects to assigned role dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl animate-pulse">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Loading EDUNEX Academic Portal...
          </span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
};

// Dynamic Role-Based Redirector for "/" and "/dashboard"
const RoleDashboardRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl animate-pulse">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Redirecting to your campus workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleDashboardPath(user.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/activate" element={<ActivateAccountPage />} />
          <Route path="/activate" element={<ActivateAccountPage />} />

          {/* Root and Dashboard Redirects */}
          <Route path="/" element={<RoleDashboardRedirect />} />
          <Route path="/dashboard" element={<RoleDashboardRedirect />} />

          {/* Role-Specific Dashboard Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/principal/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'STAFF']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'STUDENT']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PARENT']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized Access Page (403) */}
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <UnauthorizedPage />
              </ProtectedRoute>
            }
          />

          {/* Student Management */}
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />

          {/* Parent Management */}
          <Route
            path="/parents"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF']}>
                <ParentsPage />
              </ProtectedRoute>
            }
          />

          {/* Faculty & Staff Management */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']}>
                <StaffPage />
              </ProtectedRoute>
            }
          />

          {/* Academics (Departments, Courses, Subjects, Sections) */}
          <Route
            path="/academics"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER']}>
                <AcademicsPage />
              </ProtectedRoute>
            }
          />

          {/* Attendance (Students & Staff) */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT', 'PARENT']}>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          {/* Fees & Billing */}
          <Route
            path="/fees"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'STAFF', 'STUDENT', 'PARENT']}>
                <FeesPage />
              </ProtectedRoute>
            }
          />

          {/* Examinations & Grading */}
          <Route
            path="/examinations"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT', 'PARENT']}>
                <ExaminationsPage />
              </ProtectedRoute>
            }
          />

          {/* Timetable */}
          <Route
            path="/timetable"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT', 'PARENT']}>
                <TimetablePage />
              </ProtectedRoute>
            }
          />

          {/* Leave Management */}
          <Route
            path="/leaves"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF']}>
                <LeaveManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Notice Board & Announcements */}
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />

          {/* Document Repository */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT', 'PARENT']}>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />

          {/* Academic Reports & CSV Export */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* User Account Governance */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Security & Audit Trail */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Self Service Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Module Aliases */}
          <Route path="/departments" element={<Navigate to="/academics" replace />} />
          <Route path="/courses" element={<Navigate to="/academics" replace />} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
