import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { Announcement, Department, AnnouncementPriority, TargetAudience } from '../types';
import { PriorityBadge } from '../components/common/Badges';
import { useAuth } from '../context/AuthContext';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedAudience, setSelectedAudience] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'MEDIUM' as AnnouncementPriority,
    targetAudience: 'ALL' as TargetAudience,
    departmentId: '',
    publishDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [annRes, deptsRes] = await Promise.all([
        api.announcements.list({
          targetAudience: selectedAudience || undefined
        }),
        api.academics.getDepartments()
      ]);
      setAnnouncements(annRes);
      setDepartments(deptsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAudience]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    setIsSubmitting(true);
    try {
      await api.announcements.create({
        ...formData,
        departmentId: formData.targetAudience === 'DEPARTMENT' ? formData.departmentId : undefined
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        content: '',
        priority: 'MEDIUM',
        targetAudience: 'ALL',
        departmentId: '',
        publishDate: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.announcements.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete announcement.');
    }
  };

  const canPublish = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL', 'TEACHER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Campus Notice Board & Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish urgent alerts, holiday notifications, exam circulars, and departmental updates.
          </p>
        </div>

        {canPublish && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {(['', 'ALL', 'STUDENTS', 'TEACHERS', 'STAFF', 'PARENTS'] as const).map((aud) => (
          <button
            key={aud}
            onClick={() => setSelectedAudience(aud)}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedAudience === aud
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {aud === '' ? 'All Broadcasts' : aud}
          </button>
        ))}
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-xs text-slate-500 font-semibold">Loading notices...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-white rounded-3xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">No active notices available.</p>
          <p className="text-xs text-slate-400">Records will appear when users create new activity.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PriorityBadge priority={ann.priority} />
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                      Audience: {ann.targetAudience}
                    </span>
                  </div>
                  {canPublish && (
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {new Date(ann.publishDate).toLocaleDateString()}
                </span>
                <span>
                  By: {ann.author ? `${ann.author.firstName} ${ann.author.lastName}` : 'Administration'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Publish Campus Notice</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="e.g. Campus Holiday for Independence Day"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as TargetAudience })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ALL">Entire Campus (All)</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="TEACHERS">Teachers / Faculty</option>
                    <option value="STAFF">Administrative Staff</option>
                    <option value="PARENTS">Parents</option>
                    <option value="DEPARTMENT">Specific Department</option>
                  </select>
                </div>
              </div>

              {formData.targetAudience === 'DEPARTMENT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Content *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Type the full announcement message here..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
