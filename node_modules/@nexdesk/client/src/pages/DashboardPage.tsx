import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Calendar,
  DollarSign,
  ArrowRight,
  AlertCircle,
  Plus,
  Bell,
  RefreshCw,
  FileText
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { DashboardMetrics } from '../types';
import {
  StudentStatusBadge,
  ExamStatusBadge,
  PriorityBadge
} from '../components/common/Badges';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.getMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-[11px] font-bold uppercase tracking-wider mb-0.5">
            <span>Academic Command Center</span>
            <span>•</span>
            <span>Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Institutional Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live overview of active students, faculty operations, examinations, fee collections, and notices.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/students"
            className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Admit Student
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="font-bold text-rose-700 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real-Data Responsive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Students</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '-' : (metrics?.totalStudents ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {loading ? '...' : `${metrics?.activeStudents ?? 0} actively enrolled`}
            </p>
          </div>
        </div>

        {/* Faculty & Staff */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Faculty & Staff</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '-' : (metrics?.totalStaff ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {loading ? '...' : `${metrics?.totalTeachers ?? 0} teaching faculty`}
            </p>
          </div>
        </div>

        {/* Academics */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Academics</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '-' : (metrics?.totalDepartments ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {loading ? '...' : `${metrics?.totalCourses ?? 0} active courses`}
            </p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '-' : `${metrics?.todayAttendanceRate ?? 0}%`}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Today's recorded turnout
            </p>
          </div>
        </div>

        {/* Fee Collections */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Collections</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
              {loading ? '-' : formatCurrency(metrics?.totalFeeCollected ?? 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {loading ? '...' : `${formatCurrency(metrics?.pendingFeeEstimates ?? 0)} pending`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Navigation:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/students"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Student Directory
          </Link>
          <Link
            to="/staff"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Faculty & Staff
          </Link>
          <Link
            to="/academics"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Academics
          </Link>
          <Link
            to="/attendance"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Mark Attendance
          </Link>
          <Link
            to="/fees"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <DollarSign className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
            Fees & Billing
          </Link>
          <Link
            to="/timetable"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
            Timetable
          </Link>
          <Link
            to="/examinations"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
            Exams & Grading
          </Link>
          <Link
            to="/announcements"
            className="inline-flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition"
          >
            <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Notices
          </Link>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Admissions & Exams) + Right 1 Col (Announcements & Notices) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Admissions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Student Admissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Recently enrolled student profiles across academic departments</p>
              </div>
              <Link
                to="/students"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                View all students
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading recent admissions...
              </div>
            ) : !metrics?.recentAdmissions || metrics.recentAdmissions.length === 0 ? (
              <div className="p-8 text-center">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  No student admission records found.
                </p>
                <Link
                  to="/students"
                  className="mt-3 inline-flex items-center text-xs font-bold text-indigo-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Admit First Student
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">ID Number</th>
                      <th className="px-5 py-3">Course & Section</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Admission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.recentAdmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">
                            {s.firstName} {s.lastName}
                          </div>
                          <div className="text-slate-400 text-[11px]">{s.email || 'No email provided'}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600">
                          {s.studentId}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <div className="font-semibold text-slate-800">{s.course?.name || 'General Course'}</div>
                          <div className="text-slate-400 text-[11px]">{s.section?.name ? `Section ${s.section.name}` : '-'}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StudentStatusBadge status={s.status} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(s.admissionDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upcoming Examinations */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Scheduled Assessments & Examinations</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upcoming academic tests and examinations schedule</p>
              </div>
              <Link
                to="/examinations"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                Exam timetable
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading scheduled examinations...
              </div>
            ) : !metrics?.upcomingExams || metrics.upcomingExams.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  No upcoming examinations scheduled.
                </p>
                <Link
                  to="/examinations"
                  className="mt-3 inline-flex items-center text-xs font-bold text-indigo-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Schedule Examination
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{exam.title}</span>
                        <ExamStatusBadge status={exam.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Academic Year: <span className="font-semibold text-slate-700">{exam.academicYear?.name || 'Current Term'}</span> • Papers: {exam.subjects?.length ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {new Date(exam.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        to {new Date(exam.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col */}
        <div className="space-y-6">
          {/* Institutional Notice Board */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Campus Notices</h3>
              </div>
              <Link
                to="/announcements"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                All notices
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                Loading notices...
              </div>
            ) : !metrics?.activeAnnouncements || metrics.activeAnnouncements.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  No active campus notices posted.
                </p>
                <Link
                  to="/announcements"
                  className="mt-3 inline-flex items-center text-xs font-bold text-indigo-600 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Post Notice
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.activeAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {ann.title}
                      </h4>
                      <PriorityBadge priority={ann.priority} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {ann.content}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="capitalize">{ann.targetAudience.toLowerCase().replace('_', ' ')}</span>
                      <span>{new Date(ann.publishDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
