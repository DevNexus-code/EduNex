import React, { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  CalendarCheck,
  CreditCard,
  FileCheck
} from 'lucide-react';
import { api } from '../api/client';
import { AcademicReportSummary } from '../types';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<AcademicReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await api.reports.getSummary();
        setSummary(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load report summary.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const downloadCsv = (type: 'students' | 'staff' | 'attendance' | 'fees' | 'exams') => {
    const url = api.reports.getExportUrl(type);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Academic Analytics & Official Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Institutional analytics, departmental demographics, fee collections, and one-click sanitized CSV exports.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}


      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-xs text-slate-500 font-semibold">Generating academic analytics...</p>
        </div>
      ) : (
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Enrolled Students</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary?.overview.totalStudents ?? 0}
          </p>
          <span className="text-xs text-emerald-600 font-semibold">
            {summary?.overview.activeStudents ?? 0} active
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Institutional Staff</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary?.overview.totalStaff ?? 0}
          </p>
          <span className="text-xs text-slate-400">across all departments</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Overall Attendance</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {summary?.overview.overallAttendanceRate ?? 0}%
          </p>
          <span className="text-xs text-slate-400">campus aggregate</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Fees Collected</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            ${(summary?.overview.totalFeeCollected ?? 0).toLocaleString()}
          </p>
          <span className="text-xs text-emerald-600 font-semibold">cleared payments</span>
        </div>
      </div>

      {/* CSV Export Hub */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Official CSV Data Exports</h3>
          <p className="text-xs text-slate-500">
            Download RFC 4180 compliant CSV files with formula-injection defenses and structured headers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Students CSV */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600">
                <GraduationCap className="w-5 h-5" />
                <h4 className="text-xs font-bold text-slate-900">Student Directory CSV</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete student roster including admission numbers, departments, courses, section assignments, and guardian contacts.
              </p>
            </div>
            <button
              onClick={() => downloadCsv('students')}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Students CSV</span>
            </button>
          </div>

          {/* Staff CSV */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-600">
                <Briefcase className="w-5 h-5" />
                <h4 className="text-xs font-bold text-slate-900">Staff & Faculty CSV</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Institutional staff roster with staff IDs, categories, designations, employment types, and joining dates.
              </p>
            </div>
            <button
              onClick={() => downloadCsv('staff')}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Staff CSV</span>
            </button>
          </div>

          {/* Attendance CSV */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-amber-600">
                <CalendarCheck className="w-5 h-5" />
                <h4 className="text-xs font-bold text-slate-900">Attendance Log CSV</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Daily classroom attendance records with status codes (Present, Absent, Late, Excused) and teacher remarks.
              </p>
            </div>
            <button
              onClick={() => downloadCsv('attendance')}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Attendance CSV</span>
            </button>
          </div>

          {/* Fees CSV */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-purple-600">
                <CreditCard className="w-5 h-5" />
                <h4 className="text-xs font-bold text-slate-900">Fee Collections CSV</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receipts ledger with receipt numbers, student identifiers, amounts paid, payment methods, and timestamps.
              </p>
            </div>
            <button
              onClick={() => downloadCsv('fees')}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Fee Receipts CSV</span>
            </button>
          </div>

          {/* Exam Results CSV */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-blue-600">
                <FileCheck className="w-5 h-5" />
                <h4 className="text-xs font-bold text-slate-900">Examination Results CSV</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consolidated examination marks with student names, subject codes, scores, calculated letter grades, and pass status.
              </p>
            </div>
            <button
              onClick={() => downloadCsv('exams')}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Exam Grades CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enrollment by Department Breakdown */}
      {summary?.enrollmentByDepartment && summary.enrollmentByDepartment.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Enrollment by Academic Department</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {summary.enrollmentByDepartment.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-800">{item.department}</span>
                <p className="text-xl font-black text-indigo-600">{item.count} students</p>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};
