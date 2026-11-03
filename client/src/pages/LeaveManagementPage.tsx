import React, { useState, useEffect } from 'react';
import {
  CalendarRange,
  Plus,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { LeaveRequest, Staff, LeaveType } from '../types';
import { LeaveStatusBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';

export const LeaveManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [applyForm, setApplyForm] = useState({
    staffId: '',
    leaveType: 'CASUAL' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leavesRes, staffRes] = await Promise.all([
        api.leaves.list(),
        api.staff.list({ status: 'ACTIVE' })
      ]);
      setLeaves(leavesRes);
      setStaffList(staffRes);
      if (staffRes[0]) setApplyForm((prev) => ({ ...prev, staffId: staffRes[0].id }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.staffId || !applyForm.reason) return;

    setIsSubmitting(true);
    try {
      await api.leaves.apply(applyForm);
      setShowApplyModal(false);
      setApplyForm({
        staffId: staffList[0]?.id || '',
        leaveType: 'CASUAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async () => {
    if (!selectedLeave) return;
    setIsSubmitting(true);
    try {
      await api.leaves.review(selectedLeave.id, {
        status: reviewDecision,
        reviewNotes: reviewNotes || undefined
      });
      setShowReviewModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to process leave review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReviewer = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Staff Leave Requests & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Submit leave applications, review requests, and balance institutional faculty attendance.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-500 font-semibold">Loading leave requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <CalendarRange className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No leave requests recorded yet.</p>
            <p className="text-xs text-slate-400">Records will appear when users create new activity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  {isReviewer && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {l.staff ? `${l.staff.firstName} ${l.staff.lastName}` : 'N/A'}
                      <span className="text-[11px] text-slate-400 block font-normal font-mono">{l.staff?.staffId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-700">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">{l.reason}</td>
                    <td className="py-3.5 px-4">
                      <LeaveStatusBadge status={l.status} />
                    </td>
                    {isReviewer && (
                      <td className="py-3.5 px-4 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="inline-flex space-x-1">
                            <button
                              onClick={() => {
                                setSelectedLeave(l);
                                setReviewDecision('APPROVED');
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(l);
                                setReviewDecision('REJECTED');
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff Member *</label>
                <select
                  required
                  value={applyForm.staffId}
                  onChange={(e) => setApplyForm({ ...applyForm, staffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.staffId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned / Privilege Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="BEREAVEMENT">Bereavement Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Provide detailed explanation..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Leave Modal */}
      {showReviewModal && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {reviewDecision === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600">
              Reviewing application for{' '}
              <strong className="text-slate-900">
                {selectedLeave.staff?.firstName} {selectedLeave.staff?.lastName}
              </strong>{' '}
              ({selectedLeave.leaveType}).
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Review Notes / Remarks</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                placeholder="Optional reviewer feedback..."
              ></textarea>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl text-white font-bold transition disabled:opacity-60 ${
                  reviewDecision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : `Confirm ${reviewDecision}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
