import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Briefcase,
  Loader2,
  Save,
  Check,
  Download,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { Student, Staff, Department, Course, ClassSection, AcademicYear, AttendanceStatus } from '../types';

export const AttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'students' | 'monthly_report' | 'staff'>('students');

  // Sequential 5-Step Academic Filter States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);

  const [selectedYear, setSelectedYear] = useState('2026-2027');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Students attendance batch state
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Staff Attendance state
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffAttendanceMap, setStaffAttendanceMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [yearsList, deptsList, cList, sList, stList] = await Promise.all([
          api.academics.getAcademicYears(),
          api.academics.getDepartments(),
          api.academics.getCourses(),
          api.academics.getSections(),
          api.staff.list({ status: 'ACTIVE' })
        ]);
        setAcademicYears(yearsList);
        setDepartments(deptsList);
        setCourses(cList);
        setSections(sList);
        setStaffList(stList);

        const currentYear = yearsList.find((y) => y.isCurrent)?.name || '2026-2027';
        setSelectedYear(currentYear);

        if (deptsList[0]) {
          setSelectedDept(deptsList[0].id);
          const deptCourses = cList.filter((c) => c.departmentId === deptsList[0].id);
          if (deptCourses[0]) {
            setSelectedCourse(deptCourses[0].id);
            const courseSections = sList.filter((s) => s.courseId === deptCourses[0].id);
            if (courseSections[0]) setSelectedSection(courseSections[0].id);
          }
        } else if (cList[0]) {
          setSelectedCourse(cList[0].id);
          if (sList[0]) setSelectedSection(sList[0].id);
        }

        const initStaffMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
        stList.forEach((st) => {
          initStaffMap[st.id] = { status: 'PRESENT', remarks: '' };
        });
        setStaffAttendanceMap(initStaffMap);
      } catch (err: any) {
        console.error('Failed to load initial attendance metadata', err);
      }
    };
    init();
  }, []);

  // Fetch students when filters change
  useEffect(() => {
    const fetchStudentsForSection = async () => {
      if (!selectedCourse) return;
      setLoadingStudents(true);
      setSaveSuccess(false);
      try {
        const data = await api.students.list({
          departmentId: selectedDept || undefined,
          courseId: selectedCourse,
          sectionId: selectedSection || undefined,
          status: 'ACTIVE'
        });
        setStudents(data);

        // Fetch existing attendance records for this date
        const existingRecords = await api.attendance.listStudentAttendance({
          date: attendanceDate,
          sectionId: selectedSection || undefined,
          courseId: selectedCourse,
          departmentId: selectedDept || undefined
        });

        const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
        data.forEach((s) => {
          const rec = existingRecords.find((r) => r.studentId === s.id);
          newMap[s.id] = {
            status: rec ? rec.status : 'PRESENT',
            remarks: rec?.remarks || ''
          };
        });
        setAttendanceMap(newMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudentsForSection();
  }, [selectedDept, selectedCourse, selectedSection, attendanceDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks
      }
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setAttendanceMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = { ...updated[s.id], status };
      });
      return updated;
    });
  };

  const handleSaveBatch = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const attendance = Object.entries(attendanceMap).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        remarks: data.remarks || undefined
      }));

      await api.attendance.markStudentBatch({
        date: attendanceDate,
        sectionId: selectedSection || undefined,
        attendance
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save attendance register.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStaffAttendance = async () => {
    setIsSaving(true);
    try {
      for (const [staffId, val] of Object.entries(staffAttendanceMap)) {
        await api.attendance.markStaff({
          staffId,
          date: attendanceDate,
          status: val.status,
          remarks: val.remarks || undefined
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save staff attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    const exportUrl = api.attendance.getExportUrl({
      courseId: selectedCourse || undefined,
      sectionId: selectedSection || undefined,
      departmentId: selectedDept || undefined,
      date: attendanceDate
    });
    window.open(exportUrl, '_blank');
  };

  // Live Summary Calculations
  const totalCount = students.length;
  const presentCount = students.filter((s) => attendanceMap[s.id]?.status === 'PRESENT').length;
  const absentCount = students.filter((s) => attendanceMap[s.id]?.status === 'ABSENT').length;
  const lateCount = students.filter((s) => attendanceMap[s.id]?.status === 'LATE').length;
  const excusedCount = students.filter((s) => attendanceMap[s.id]?.status === 'EXCUSED').length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  // Filter cascading helpers
  const availableCourses = courses.filter((c) => !selectedDept || c.departmentId === selectedDept);
  const availableSections = sections.filter((s) => !selectedCourse || s.courseId === selectedCourse);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Attendance Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record daily classroom student registers, track staff check-ins, and generate attendance percentages.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'students'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Student Attendance Register</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'staff'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Faculty & Staff Attendance</span>
        </button>
      </div>

      {/* Tab 1: Student Daily Register */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Sequential 5-Step Selection Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Sequential Attendance Selection Workflow
              </span>
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export to Excel / CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              {/* Step 1: Academic Session */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  1. Academic Session *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>
                      {y.name} {y.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Department */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  2. Department *
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setSelectedDept(newDept);
                    const matchingCourses = courses.filter((c) => !newDept || c.departmentId === newDept);
                    const newCourseId = matchingCourses[0]?.id || '';
                    setSelectedCourse(newCourseId);
                    const matchingSecs = sections.filter((s) => !newCourseId || s.courseId === newCourseId);
                    setSelectedSection(matchingSecs[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Course */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  3. Course *
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    const newCourseId = e.target.value;
                    setSelectedCourse(newCourseId);
                    const matchingSecs = sections.filter((s) => !newCourseId || s.courseId === newCourseId);
                    setSelectedSection(matchingSecs[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Course</option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 4: Class Section */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  4. Class Section *
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Sections</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 5: Attendance Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  5. Attendance Date *
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Bulk Actions & Save */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Bulk Marking:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition"
                >
                  Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('LATE')}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition"
                >
                  Mark All Late
                </button>
              </div>

              <button
                onClick={handleSaveBatch}
                disabled={isSaving || students.length === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saveSuccess ? 'Register Saved!' : 'Save Attendance Register'}</span>
              </button>
            </div>
          </div>

          {/* Live Attendance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Total Enrolled</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xl font-black text-slate-900">{totalCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <div className="flex items-center justify-between text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Present</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-600">{presentCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <div className="flex items-center justify-between text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Absent</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-xl font-black text-rose-600">{absentCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
              <div className="flex items-center justify-between text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Late</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-black text-amber-600">{lateCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
              <div className="flex items-center justify-between text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Excused / Leave</span>
                <AlertTriangle className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl font-black text-blue-600">{excusedCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
              <div className="flex items-center justify-between text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Attendance %</span>
                <span className="text-[10px] font-bold text-indigo-500">Live</span>
              </div>
              <p className="text-xl font-black text-indigo-600">{attendanceRate}%</p>
            </div>
          </div>

          {/* Student Register Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingStudents ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="mt-2 text-xs text-slate-500 font-semibold">Loading student roster...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">No active students found for selected filters.</p>
                <p className="text-xs text-slate-400">Please choose a course or section with enrolled students above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Student ID & Admission</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4 text-center">Mark Attendance</th>
                      <th className="py-3 px-4">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st) => {
                      const currentStatus = attendanceMap[st.id]?.status || 'PRESENT';
                      const currentRemarks = attendanceMap[st.id]?.remarks || '';
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-slate-900 block">{st.studentId}</span>
                            <span className="text-[11px] text-slate-400">{st.admissionNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">
                              {st.firstName} {st.lastName}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{st.section?.name || 'Section'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-1.5">
                              {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatus[]).map((stKey) => {
                                const isSelected = currentStatus === stKey;
                                const colors: Record<AttendanceStatus, string> = {
                                  PRESENT: isSelected
                                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                                  ABSENT: isSelected
                                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                                  LATE: isSelected
                                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                                  EXCUSED: isSelected
                                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                                  HALF_DAY: 'bg-slate-100 text-slate-700'
                                };
                                return (
                                  <button
                                    key={stKey}
                                    type="button"
                                    onClick={() => handleStatusChange(st.id, stKey)}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition border border-transparent ${colors[stKey]}`}
                                  >
                                    {stKey === 'EXCUSED' ? 'Leave' : stKey}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={currentRemarks}
                              onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                              placeholder="Add optional notes..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Staff Attendance */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-700">Staff Attendance Date:</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium bg-white"
              />
            </div>
            <button
              onClick={handleSaveStaffAttendance}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'Saved!' : 'Save Staff Attendance'}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Staff Name & Designation</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((st) => {
                  const currentStatus = staffAttendanceMap[st.id]?.status || 'PRESENT';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.staffId}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {st.firstName} {st.lastName}
                        </span>
                        <span className="text-[11px] text-slate-500 block">{st.designation}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {st.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map((stKey) => {
                            const isSelected = currentStatus === stKey;
                            return (
                              <button
                                key={stKey}
                                type="button"
                                onClick={() =>
                                  setStaffAttendanceMap((prev) => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], status: stKey }
                                  }))
                                }
                                className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white font-bold'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {stKey}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={staffAttendanceMap[st.id]?.remarks || ''}
                          onChange={(e) =>
                            setStaffAttendanceMap((prev) => ({
                              ...prev,
                              [st.id]: { ...prev[st.id], remarks: e.target.value }
                            }))
                          }
                          placeholder="Optional remarks..."
                          className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
