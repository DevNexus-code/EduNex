import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  AlertCircle,
  X,
  Trash2,
  MapPin,
  User as UserIcon,
  BookOpen,
  Calendar,
  Pencil,
  AlertTriangle,
  Coffee,
  Users
} from 'lucide-react';
import { api } from '../api/client';
import { Timetable, ClassSection, Subject, Staff, DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

type ViewMode = 'section' | 'teacher' | 'subject';

export const TimetablePage: React.FC = () => {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [error, setError] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('section');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Timetable | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalConflictError, setModalConflictError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sectionId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: 'MONDAY' as DayOfWeek,
    startTime: '09:00',
    endTime: '10:00',
    roomNumber: 'Room 101'
  });

  const fetchInitial = async () => {
    try {
      const [secRes, subjRes, teachRes] = await Promise.all([
        api.academics.getSections(),
        api.academics.getSubjects(),
        api.staff.list({ category: 'TEACHING', status: 'ACTIVE' })
      ]);
      setSections(secRes);
      setSubjects(subjRes);
      setTeachers(teachRes);

      if (secRes[0] && !selectedSectionId) {
        setSelectedSectionId(secRes[0].id);
      }
      if (teachRes[0] && !selectedTeacherId) {
        setSelectedTeacherId(teachRes[0].id);
      }
      if (subjRes[0] && !selectedSubjectId) {
        setSelectedSubjectId(subjRes[0].id);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load timetable metadata.');
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchSchedule = async () => {
    try {
      let params: Record<string, string> = {};
      if (viewMode === 'section' && selectedSectionId) {
        params.sectionId = selectedSectionId;
      } else if (viewMode === 'teacher' && selectedTeacherId) {
        params.teacherId = selectedTeacherId;
      } else if (viewMode === 'subject' && selectedSubjectId) {
        params.subjectId = selectedSubjectId;
      } else {
        return;
      }

      const data = await api.timetable.list(params);
      setTimetable(data);
    } catch (err: any) {
      console.error('Failed to load timetable:', err);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [viewMode, selectedSectionId, selectedTeacherId, selectedSubjectId]);

  const openAddModal = (defaultDay?: DayOfWeek) => {
    setEditingSlot(null);
    setModalConflictError(null);
    setFormData({
      sectionId: selectedSectionId || sections[0]?.id || '',
      subjectId: selectedSubjectId || subjects[0]?.id || '',
      teacherId: selectedTeacherId || teachers[0]?.id || '',
      dayOfWeek: defaultDay || 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      roomNumber: 'Room 101'
    });
    setShowModal(true);
  };

  const openEditModal = (slot: Timetable) => {
    setEditingSlot(slot);
    setModalConflictError(null);
    setFormData({
      sectionId: slot.sectionId || '',
      subjectId: slot.subjectId,
      teacherId: slot.teacherId || (teachers.find((t) => t.userId === slot.teacher?.id)?.id || teachers[0]?.id || ''),
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNumber: slot.roomNumber || 'Room 101'
    });
    setShowModal(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sectionId || !formData.subjectId || !formData.teacherId) {
      setModalConflictError('Please select Section, Subject, and Teacher.');
      return;
    }

    setIsSubmitting(true);
    setModalConflictError(null);

    try {
      if (editingSlot) {
        await api.timetable.update(editingSlot.id, formData);
      } else {
        await api.timetable.create(formData);
      }
      setShowModal(false);
      fetchSchedule();
    } catch (err: any) {
      setModalConflictError(err.message || 'Schedule conflict detected. Please verify room, teacher, and section availability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await api.timetable.delete(id);
      fetchSchedule();
    } catch (err: any) {
      alert(err.message || 'Failed to delete slot.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Academic Schedule & Timetable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Design conflict-free weekly schedules across class sections, teaching faculty, and curriculum subjects.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Period Slot</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* View Switcher & Selection Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Mode Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setViewMode('section')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'section'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By Class Section</span>
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'teacher'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>By Teacher</span>
          </button>
          <button
            onClick={() => setViewMode('subject')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'subject'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>By Subject</span>
          </button>
        </div>

        {/* Dynamic Selector Dropdown */}
        <div className="flex items-center space-x-3">
          {viewMode === 'section' && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Section:</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.course?.name || 'General'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'teacher' && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Teacher:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.designation || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'subject' && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Timetable Weekly Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DAYS.map((day) => {
          const slotsForDay = timetable
            .filter((t) => t.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const morningSlots = slotsForDay.filter((s) => s.startTime < '12:30');
          const afternoonSlots = slotsForDay.filter((s) => s.startTime >= '12:30');

          return (
            <div key={day} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3.5 flex flex-col justify-between">
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="font-black text-xs uppercase tracking-wider text-slate-900">{day}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500 font-semibold">{slotsForDay.length} periods</span>
                    <button
                      onClick={() => openAddModal(day)}
                      title={`Add period to ${day}`}
                      className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {slotsForDay.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                    <Clock className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-500">No periods scheduled</p>
                    <p className="text-[11px]">Click &quot;+&quot; to schedule a class</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {/* Morning Periods */}
                    {morningSlots.map((slot) => renderSlotCard(slot, openEditModal, handleDeleteSlot))}

                    {/* Lunch Break Banner if day has both morning and afternoon periods or periods crossing midday */}
                    {(morningSlots.length > 0 && afternoonSlots.length > 0) && (
                      <div className="py-1.5 px-3 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center space-x-1.5 text-[11px] font-bold text-amber-800">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        <span>12:30 PM — 01:15 PM Lunch Break</span>
                      </div>
                    )}

                    {/* Afternoon Periods */}
                    {afternoonSlots.map((slot) => renderSlotCard(slot, openEditModal, handleDeleteSlot))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Slot Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSlot ? 'Edit Period Slot' : 'Add Period Slot'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Server Conflict Error Banner */}
            {modalConflictError && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Schedule Conflict Detected</p>
                  <p className="text-[11px] leading-relaxed">{modalConflictError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Section *</label>
                <select
                  required
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.course?.name || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Teacher *</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Day of Week *</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as DayOfWeek })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Room / Hall Number *</label>
                <input
                  type="text"
                  required
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                  placeholder="e.g. Room 204, Lecture Hall B"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Validating Conflicts...' : editingSlot ? 'Update Period' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function renderSlotCard(
  slot: Timetable,
  onEdit: (slot: Timetable) => void,
  onDelete: (id: string) => void
) {
  return (
    <div
      key={slot.id}
      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 transition space-y-2 text-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-black text-slate-900 block leading-tight">{slot.subject?.name || 'Class Subject'}</span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">{slot.subject?.code}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onEdit(slot)}
            title="Edit Slot"
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(slot.id)}
            title="Delete Slot"
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 space-y-1">
        <div className="flex items-center space-x-1.5 font-bold text-indigo-700">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            {slot.startTime} — {slot.endTime}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">
            {slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-500 pt-0.5">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{slot.roomNumber || 'TBA'}</span>
          </div>
          {slot.section && (
            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-bold text-slate-700">
              {slot.section.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
