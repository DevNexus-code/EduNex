import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  CreditCard,
  FileCheck,
  Clock,
  Bell,
  AlertCircle,
  Loader2,
  ChevronDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { ParentChildSummary, ChildAcademicSummary } from '../../types';

export const ParentDashboardView: React.FC = () => {
  const [familyData, setFamilyData] = useState<ParentChildSummary | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [childSummary, setChildSummary] = useState<ChildAcademicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'ACADEMICS' | 'FEES' | 'TIMETABLE' | 'NOTICES'>('OVERVIEW');

  // Fetch parent profile and children list
  useEffect(() => {
    const fetchFamily = async () => {
      try {
        setLoading(true);
        const data = await api.parents.getMyChildren();
        setFamilyData(data);
        if (data.children && data.children.length > 0) {
          setSelectedChildId(data.children[0].studentId || data.children[0].id);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load children profiles.');
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
  }, []);

  // Fetch specific child summary when selectedChildId changes
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchChildSummary = async () => {
      try {
        setSummaryLoading(true);
        const summary = await api.parents.getChildSummary(selectedChildId);
        setChildSummary(summary);
      } catch (err: any) {
        setError(err.message || 'Failed to load academic records for selected child.');
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchChildSummary();
  }, [selectedChildId]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading Parent Portal & Family Records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const children = familyData?.children || [];
  const parent = familyData?.parent;
  const currentChild = children.find(
    (c) => c.studentId === selectedChildId || c.id === selectedChildId
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Parent Welcome & Child Switcher Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                PARENT PORTAL
              </span>
              <span className="text-xs text-slate-400 font-mono">Parent ID: {parent?.parentId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome, {parent?.name}
            </h1>
            <p className="text-xs text-slate-400">
              Monitoring academic growth, daily attendance, examination grades, and fee transactions.
            </p>
          </div>

          {/* Child Switcher Component */}
          {children.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 space-y-1 self-start md:self-auto min-w-[240px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block px-2">
                Active Student View ({children.length} {children.length === 1 ? 'Child' : 'Children'})
              </span>
              <div className="relative">
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-2 pr-8 border border-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.studentId || child.id}>
                      {child.name} ({child.studentId})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Selected Child Quick Header */}
        {currentChild && (
          <div className="mt-5 pt-4 border-t border-indigo-900/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Course & Department</span>
              <span className="font-bold text-white block truncate">{currentChild.course}</span>
              <span className="text-[10px] text-indigo-300 truncate block">{currentChild.department}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Admission Number</span>
              <span className="font-mono font-bold text-white block">{currentChild.admissionNumber}</span>
              <span className="text-[10px] text-slate-400">Sec: {currentChild.section}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Academic Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mt-0.5">
                {currentChild.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Student ID Code</span>
              <span className="font-mono font-bold text-indigo-300 text-sm block">
                {currentChild.studentId}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* No Children Enrolled Warning */}
      {children.length === 0 && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Student Records Associated</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no active students linked to this parent account ({parent?.parentId}). Please contact campus admissions to link your child.
          </p>
        </div>
      )}

      {children.length > 0 && (
        <>
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto space-x-2 text-xs font-bold scrollbar-none">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Academic Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Attendance Records</span>
            </button>
            <button
              onClick={() => setActiveTab('ACADEMICS')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'ACADEMICS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Examinations & Grades</span>
            </button>
            <button
              onClick={() => setActiveTab('FEES')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'FEES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Fees & Invoices</span>
            </button>
            <button
              onClick={() => setActiveTab('TIMETABLE')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'TIMETABLE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Class Timetable</span>
            </button>
            <button
              onClick={() => setActiveTab('NOTICES')}
              className={`py-2.5 px-4 rounded-xl transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'NOTICES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Campus Notices</span>
            </button>
          </div>

          {summaryLoading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500">Loading student details...</span>
            </div>
          ) : childSummary ? (
            <div className="space-y-6">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Attendance Rate
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-2xl font-black text-slate-900">
                            {childSummary.metrics.attendanceRate}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({childSummary.metrics.presentCount}/{childSummary.metrics.totalAttendanceSessions} days)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Pending Fee Balance
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-2xl font-black text-slate-900">
                            ₹{childSummary.metrics.balanceDue.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (Paid: ₹{childSummary.metrics.totalFeePaid.toLocaleString()})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
                      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Evaluated Assessments
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {childSummary.marks.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Two Column Grid: Recent Attendance & Recent Exam Marks */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Attendance */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Recent Attendance Activity
                        </h3>
                        <button
                          onClick={() => setActiveTab('ATTENDANCE')}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          View All
                        </button>
                      </div>

                      {childSummary.attendance.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No recent attendance logged.</p>
                      ) : (
                        <div className="space-y-2">
                          {childSummary.attendance.slice(0, 5).map((att) => (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {att.date ? new Date(att.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Recent'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(att as any).Subject?.name || (att as any).subject?.name || 'Class Session'}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.status === 'PRESENT'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {att.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Marks */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Recent Examination Results
                        </h3>
                        <button
                          onClick={() => setActiveTab('ACADEMICS')}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          View All
                        </button>
                      </div>

                      {childSummary.marks.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No examination results released yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {childSummary.marks.slice(0, 5).map((mark) => (
                            <div
                              key={mark.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {(mark as any).Subject?.name || (mark as any).subject?.name || (mark as any).examSubject?.subject?.name || 'Academic Subject'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(mark as any).Examination?.name || (mark as any).examination?.name || (mark as any).examSubject?.examination?.title || 'Examination'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900 block">
                                  {mark.marksObtained} / {(mark as any).maxMarks || (mark as any).examSubject?.maxMarks || 100}
                                </span>
                                <span className="text-[10px] font-mono text-indigo-600 font-bold">
                                  Grade: {mark.grade || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE */}
              {activeTab === 'ATTENDANCE' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Attendance Logbook</h3>
                      <p className="text-xs text-slate-500">
                        Daily classroom presence record for {currentChild?.name}.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Overall Percentage</span>
                      <span className="text-xl font-black text-emerald-600">
                        {childSummary.metrics.attendanceRate}%
                      </span>
                    </div>
                  </div>

                  {childSummary.attendance.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No attendance logs available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Subject / Period</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {childSummary.attendance.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-medium text-slate-900">
                                {att.date ? new Date(att.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                {(att as any).Subject?.name || (att as any).subject?.name || 'Class Session'}
                              </td>
                              <td className="py-3 px-3">
                                {att.status === 'PRESENT' ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Present</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3" />
                                    <span>Absent</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-400 text-[11px]">
                                {att.remarks || 'Regular class attendance recorded.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACADEMICS & EXAMS */}
              {activeTab === 'ACADEMICS' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Official Examination Transcript</h3>
                      <p className="text-xs text-slate-500">
                        Subject scores and performance evaluations for {currentChild?.name}.
                      </p>
                    </div>
                  </div>

                  {childSummary.marks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No examination scores currently published.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Examination</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Score Obtained</th>
                            <th className="py-2.5 px-3">Maximum Score</th>
                            <th className="py-2.5 px-3">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {childSummary.marks.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-bold text-slate-900">
                                {(m as any).Examination?.name || (m as any).examination?.name || (m as any).examSubject?.examination?.title || 'Institutional Exam'}
                              </td>
                              <td className="py-3 px-3 text-slate-700 font-medium">
                                {(m as any).Subject?.name || (m as any).subject?.name || (m as any).examSubject?.subject?.name || 'General Subject'}
                              </td>
                              <td className="py-3 px-3 font-black text-indigo-700">
                                {m.marksObtained}
                              </td>
                              <td className="py-3 px-3 text-slate-500">{(m as any).maxMarks || (m as any).examSubject?.maxMarks || 100}</td>
                              <td className="py-3 px-3">
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                  {m.grade || 'PASS'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FEES */}
              {activeTab === 'FEES' && (
                <div className="space-y-6">
                  {/* Fee Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Course Fees
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        ₹{childSummary.metrics.totalFeeAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Amount Paid
                      </span>
                      <span className="text-xl font-black text-emerald-600">
                        ₹{childSummary.metrics.totalFeePaid.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Pending Due Balance
                      </span>
                      <span className="text-xl font-black text-rose-600">
                        ₹{childSummary.metrics.balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Payment Receipts & History</h3>

                    {childSummary.feePayments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No fee payments logged yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Receipt / Ref</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Payment Method</th>
                              <th className="py-2.5 px-3">Amount Paid</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {childSummary.feePayments.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-3 font-medium text-slate-900">
                                  {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '-'}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                                  {p.receiptNumber || p.transactionRef || 'RCP-ONLINE'}
                                </td>
                                <td className="py-3 px-3 text-slate-700">
                                  {(p as any).FeeCategory?.name || (p as any).feeCategory?.name || (p as any).feeStructure?.category?.name || 'Tuition Fee'}
                                </td>
                                <td className="py-3 px-3 text-slate-600 font-semibold">{p.paymentMethod}</td>
                                <td className="py-3 px-3 font-bold text-emerald-600">
                                  ₹{p.amountPaid.toLocaleString()}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: TIMETABLE */}
              {activeTab === 'TIMETABLE' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Weekly Class Timetable</h3>
                      <p className="text-xs text-slate-500">
                        Class schedule for {currentChild?.name} ({currentChild?.section}).
                      </p>
                    </div>
                  </div>

                  {childSummary.timetable.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">Timetable not assigned for this class section.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Day of Week</th>
                            <th className="py-2.5 px-3">Timing</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Faculty / Instructor</th>
                            <th className="py-2.5 px-3">Room</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {childSummary.timetable.map((slot) => (
                            <tr key={slot.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-bold text-slate-900">{slot.dayOfWeek}</td>
                              <td className="py-3 px-3 font-mono text-[11px] text-indigo-600">
                                {slot.startTime} - {slot.endTime}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {slot.subject?.name || 'Class Subject'}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                {slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : 'Faculty Assigned'}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                                {slot.roomNumber || 'Room 101'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: NOTICES */}
              {activeTab === 'NOTICES' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Campus Notices & Circulars</h3>
                      <p className="text-xs text-slate-500">
                        Official communications broadcasted to parents and students.
                      </p>
                    </div>
                  </div>

                  {childSummary.announcements.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No campus notices posted at this time.</p>
                  ) : (
                    <div className="space-y-3">
                      {childSummary.announcements.map((notice) => (
                        <div
                          key={notice.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{notice.title}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('en-IN') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
