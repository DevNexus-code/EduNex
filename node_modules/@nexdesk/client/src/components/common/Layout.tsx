import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Briefcase,
  BookOpen,
  CalendarCheck,
  CreditCard,
  FileCheck,
  Clock,
  CalendarRange,
  Bell,
  FileText,
  BarChart3,
  UserCheck,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from './Badges';
import { getRoleDashboardPath } from '../../utils/navigation';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  if (!user) {
    return <>{children}</>;
  }

  const role = user.role;
  const dashboardPath = getRoleDashboardPath(role);

  // Primary Academic Operations Navigation
  const academicNav = [
    { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT', 'PARENT'] },
    { label: 'Students', path: '/students', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF'] },
    { label: 'Faculty & Staff', path: '/staff', icon: Briefcase, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'] },
    { label: 'Academics', path: '/academics', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER'] },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT'] },
    { label: 'Fees & Billing', path: '/fees', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'STAFF', 'STUDENT'] },
    { label: 'Examinations', path: '/examinations', icon: FileCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT'] },
    { label: 'Timetable', path: '/timetable', icon: Clock, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT', 'PARENT'] },
    { label: 'Leave Requests', path: '/leaves', icon: CalendarRange, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF'] },
    { label: 'Announcements', path: '/announcements', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT', 'PARENT'] },
    { label: 'Documents', path: '/documents', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER', 'STAFF', 'STUDENT'] }
  ];

  // Governance & Institutional Analytics Navigation
  const governanceNav = [
    { label: 'Reports & CSV', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER'] },
    { label: 'User Accounts', path: '/users', icon: UserCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'] },
    { label: 'Audit Trail', path: '/audit', icon: ShieldAlert, roles: ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'] }
  ];

  const visibleAcademic = academicNav.filter((item) => item.roles.includes(role));
  const visibleGovernance = governanceNav.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Header Bar across desktop and mobile */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Navigation Drawer"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to={dashboardPath} className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 border border-indigo-400/30 group-hover:scale-105 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-lg text-white tracking-tight">
                  EDU<span className="text-indigo-400">NEX</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-400/30">
                  Campus
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Smart Academic Management</p>
            </div>
          </Link>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-3">
          <Link
            to="/profile"
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition group"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover border border-indigo-400/30 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user.firstName[0]}
                {user.lastName ? user.lastName[0] : ''}
              </div>
            )}
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition leading-tight">
                {user.firstName} {user.lastName || ''}
              </p>
              <div className="mt-0.5 scale-90 origin-left">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Modern Slide-In Navigation Drawer with Backdrop */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <aside
              className="w-72 sm:w-80 bg-slate-900 text-slate-300 border-r border-slate-800 shadow-2xl flex flex-col select-none animate-in slide-in-from-left duration-200"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Menu"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/40">
                <Link
                  to={dashboardPath}
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center space-x-2.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 border border-indigo-400/30">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-lg text-white tracking-tight">
                        EDU<span className="text-indigo-400">NEX</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Academic Portal Navigation</p>
                  </div>
                </Link>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Navigation Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-6">
                {/* Academic Operations */}
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Campus Operations
                  </p>
                  <nav className="space-y-1">
                    {visibleAcademic.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.path ||
                        (item.label === 'Dashboard' && (location.pathname === '/' || location.pathname.endsWith('/dashboard')));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsDrawerOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-200' : 'text-slate-600'}`} />
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                {/* Governance & Reporting */}
                {visibleGovernance.length > 0 && (
                  <div>
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Governance & Audit
                    </p>
                    <nav className="space-y-1">
                      {visibleGovernance.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsDrawerOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-200' : 'text-slate-600'}`} />
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>

              {/* Drawer Footer Capsule */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0 mt-auto">
                <Link
                  to="/profile"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition group"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName}
                      className="w-9 h-9 rounded-full object-cover border border-indigo-400/30 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {user.firstName[0]}
                      {user.lastName ? user.lastName[0] : ''}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">
                      {user.firstName} {user.lastName || ''}
                    </p>
                    <div className="mt-0.5">
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full mt-2 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Main Page Content Body - Full Width & Responsive */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
};
