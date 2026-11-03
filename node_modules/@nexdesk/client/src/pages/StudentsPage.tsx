import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit2,
  Eye,
  X,
  Copy,
  CheckCircle2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import { Student, Department, Course, ClassSection, StudentAdmissionCredentials } from '../types';
import { StudentStatusBadge } from '../components/common/Badges';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parent Admission Mode & Credential Slip
  const [parentMode, setParentMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [admissionSlip, setAdmissionSlip] = useState<StudentAdmissionCredentials | null>(null);
  const [resetModalData, setResetModalData] = useState<{
    title: string;
    targetName: string;
    identifier: string;
    temporaryPassword: string;
    policyNote?: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [resendEmailNotice, setResendEmailNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodGroup: '',
    departmentId: '',
    courseId: '',
    sectionId: '',
    status: 'ACTIVE' as any,
    admissionDate: new Date().toISOString().split('T')[0],
    address: '',
    // Parent / Guardian Information
    parentName: '',
    parentRelationship: 'Father',
    parentPhone: '',
    parentAlternatePhone: '',
    parentEmail: '',
    parentAddress: '',
    emergencyPhone: '',
    parentOccupation: '',
    existingParentIdentifier: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const filterParams: Record<string, string> = {};
      if (search.trim()) filterParams.search = search.trim();
      if (selectedDept) filterParams.departmentId = selectedDept;
      if (selectedCourse) filterParams.courseId = selectedCourse;
      if (selectedStatus) filterParams.status = selectedStatus;

      const [studentsData, deptsData, coursesData, sectionsData] = await Promise.all([
        api.students.list(filterParams),
        api.academics.getDepartments(),
        api.academics.getCourses(),
        api.academics.getSections()
      ]);
      setStudents(studentsData);
      setDepartments(deptsData);
      setCourses(coursesData);
      setSections(sectionsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedDept, selectedCourse, selectedStatus]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleResetStudentPassword = async (student: Student) => {
    if (!confirm(`Reset temporary password for student ${student.firstName} ${student.lastName}?`)) return;
    setIsResetting(true);
    try {
      const res = await api.students.resetPassword(student.id);
      setResetModalData({
        title: 'Student Account Credential Generated',
        targetName: (res as any).data?.studentName || `${student.firstName} ${student.lastName}`,
        identifier: (res as any).data?.studentId || student.studentId,
        temporaryPassword: (res as any).data?.temporaryPassword,
        policyNote: (res as any).data?.policyNote
      });
    } catch (err: any) {
      alert(err.message || 'Failed to reset student password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetParentPassword = async (student: Student) => {
    if (!confirm(`Reset temporary password for parent linked to ${student.firstName} ${student.lastName}?`)) return;
    setIsResetting(true);
    try {
      const res = await api.students.resetParentPassword(student.id);
      setResetModalData({
        title: 'Parent Account Credential Generated',
        targetName: (res as any).data?.parentName || 'Parent / Guardian',
        identifier: (res as any).data?.parentId || 'PRN-N/A',
        temporaryPassword: (res as any).data?.temporaryPassword,
        policyNote: (res as any).data?.policyNote
      });
    } catch (err: any) {
      alert(err.message || 'Failed to reset parent password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResendAdmissionEmail = async (student: Student) => {
    setResendingEmailId(student.id);
    setResendEmailNotice(null);
    try {
      const res = await api.students.resendAdmissionEmail(student.id);
      setResendEmailNotice(res.message);
      setTimeout(() => setResendEmailNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to resend admission confirmation email.');
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.departmentId || !formData.courseId) {
      alert('Please fill all required student academic information.');
      return;
    }

    if (parentMode === 'NEW' && !formData.parentPhone) {
      alert('Primary Parent Mobile Number is required for student admission.');
      return;
    }

    if (parentMode === 'EXISTING' && !formData.existingParentIdentifier) {
      alert('Please provide the existing Parent ID or verified mobile number to link.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
        bloodGroup: formData.bloodGroup || undefined,
        departmentId: formData.departmentId,
        courseId: formData.courseId,
        sectionId: formData.sectionId || undefined,
        admissionDate: formData.admissionDate,
        address: formData.address.trim() || undefined
      };

      if (parentMode === 'EXISTING') {
        payload.parentMode = 'EXISTING';
        payload.existingParentIdentifier = formData.existingParentIdentifier.trim();
        payload.parentRelationship = formData.parentRelationship;
      } else {
        payload.parentMode = 'NEW';
        payload.parentName = formData.parentName.trim() || `${formData.lastName} Guardian`;
        payload.parentRelationship = formData.parentRelationship;
        payload.parentPhone = formData.parentPhone.trim();
        payload.parentAlternatePhone = formData.parentAlternatePhone.trim() || undefined;
        payload.parentEmail = formData.parentEmail.trim() || undefined;
        payload.parentAddress = formData.parentAddress.trim() || formData.address.trim() || undefined;
        payload.emergencyPhone = formData.emergencyPhone.trim() || undefined;
        payload.parentOccupation = formData.parentOccupation.trim() || undefined;
      }

      const res: any = await api.students.create(payload);
      setShowAddModal(false);
      resetForm();
      fetchData();

      // Show secure credential slip
      if (res?.credentials) {
        setAdmissionSlip(res.credentials);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      await api.students.update(selectedStudent.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup || undefined,
        departmentId: formData.departmentId || undefined,
        courseId: formData.courseId || undefined,
        sectionId: formData.sectionId || null,
        status: formData.status || undefined,
        guardianName: formData.parentName || undefined,
        guardianPhone: formData.parentPhone || undefined
      });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveStudent = async (id: string) => {
    if (!confirm('Are you sure you want to mark this student as INACTIVE?')) return;
    try {
      await api.students.archive(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to archive student.');
    }
  };

  const resetForm = () => {
    const firstDept = departments[0]?.id || '';
    const firstCourse = courses.find((c) => !firstDept || c.departmentId === firstDept)?.id || '';
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'Male',
      dateOfBirth: '',
      bloodGroup: '',
      departmentId: firstDept,
      courseId: firstCourse,
      sectionId: '',
      status: 'ACTIVE' as any,
      admissionDate: new Date().toISOString().split('T')[0],
      address: '',
      parentName: '',
      parentRelationship: 'Father',
      parentPhone: '',
      parentAlternatePhone: '',
      parentEmail: '',
      parentAddress: '',
      emergencyPhone: '',
      parentOccupation: '',
      existingParentIdentifier: ''
    });
    setParentMode('NEW');
  };

  const openEdit = (s: Student) => {
    setSelectedStudent(s);
    setFormData({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone || '',
      gender: s.gender || 'Male',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split('T')[0] : '',
      bloodGroup: s.bloodGroup || '',
      departmentId: s.departmentId,
      courseId: s.courseId,
      sectionId: s.sectionId || '',
      status: s.status,
      admissionDate: s.admissionDate ? s.admissionDate.split('T')[0] : '',
      address: s.address || '',
      parentName: s.guardianName || '',
      parentRelationship: s.guardianRelationship || 'Father',
      parentPhone: s.guardianPhone || '',
      parentAlternatePhone: '',
      parentEmail: s.guardianEmail || '',
      parentAddress: s.address || '',
      emergencyPhone: '',
      parentOccupation: '',
      existingParentIdentifier: ''
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Student Management & Admissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Maintain complete student profiles, enrollment status, attendance history, and fee balances.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Admit New Student</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, email, or Student ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedCourse('');
            }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Courses</option>
            {courses
              .filter((c) => !selectedDept || c.departmentId === selectedDept)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="GRADUATED">Graduated</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {(search || selectedDept || selectedCourse || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedDept('');
                setSelectedCourse('');
                setSelectedStatus('');
              }}
              className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-500 font-semibold">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No records available yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Records will appear when users create new activity. Click "Admit New Student" to enroll your first student.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student ID & Admission</th>
                  <th className="py-3 px-4">Student Name & Contact</th>
                  <th className="py-3 px-4">Department & Course</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{s.studentId}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">{s.admissionNumber}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{s.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{s.course?.name || 'N/A'}</span>
                      <span className="text-[11px] text-slate-400 block">{s.department?.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">{s.section?.name || 'Unassigned'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StudentStatusBadge status={s.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveStudent(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Archive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Drawer */}
      {selectedStudent && !showEditModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedStudent.studentId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Academic Information
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Department</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.department?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Course</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.course?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Section</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.section?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status</span>
                    <StudentStatusBadge status={selectedStudent.status} />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Personal & Contact
                </h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedStudent.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedStudent.address || 'No address provided'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Parent / Guardian Information
                  </h4>
                  {selectedStudent.parent?.parentId && (
                    <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-200">
                      {selectedStudent.parent.parentId}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>
                    <span className="text-slate-400">Name:</span>{' '}
                    <strong className="text-slate-800">
                      {selectedStudent.parent?.name || selectedStudent.guardianName || 'N/A'}
                    </strong>{' '}
                    ({selectedStudent.parent?.relation || selectedStudent.guardianRelationship || 'Guardian'})
                  </p>
                  <p>
                    <span className="text-slate-400">Primary Mobile:</span>{' '}
                    <strong className="text-slate-800">
                      {selectedStudent.parent?.phone || selectedStudent.guardianPhone || 'N/A'}
                    </strong>
                  </p>
                  {selectedStudent.parent?.alternatePhone && (
                    <p>
                      <span className="text-slate-400">Alt Phone:</span>{' '}
                      <strong className="text-slate-800">{selectedStudent.parent.alternatePhone}</strong>
                    </p>
                  )}
                  {selectedStudent.parent?.emergencyPhone && (
                    <p>
                      <span className="text-slate-400">Emergency:</span>{' '}
                      <strong className="text-slate-800">{selectedStudent.parent.emergencyPhone}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Portal Access & Password Reset Actions */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                    Portal Credentials & Password Reset
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Generate a one-time temporary password for this student or their linked parent account.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => handleResetStudentPassword(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/70 transition disabled:opacity-50"
                  >
                    {isResetting ? 'Generating...' : 'Reset Student Password'}
                  </button>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => handleResetParentPassword(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/70 transition disabled:opacity-50"
                  >
                    {isResetting ? 'Generating...' : 'Reset Parent Password'}
                  </button>
                  <button
                    type="button"
                    disabled={resendingEmailId === selectedStudent.id}
                    onClick={() => handleResendAdmissionEmail(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs hover:bg-indigo-100 transition disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    <span>{resendingEmailId === selectedStudent.id ? 'Dispatching...' : 'Resend Admission Email'}</span>
                  </button>
                </div>
                {resendEmailNotice && (
                  <p className="text-[11px] font-bold text-emerald-700 pt-1">
                    ✓ {resendEmailNotice}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <button
                onClick={() => {
                  openEdit(selectedStudent);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Edit Student Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Admission & Enrollment Form</h3>
                <p className="text-xs text-slate-500">
                  Enrolls a student, provisions their profile, and automatically creates or links a parent account.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="py-4 space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Part 1: Student Information */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                  <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    1. Student Academic & Personal Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. Aarav"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g. Sharma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="aarav.sharma@edunex.edu"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Phone (Optional)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                    <input
                      type="text"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      placeholder="e.g. O+, B+, A+"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const available = courses.filter((c) => !newDept || c.departmentId === newDept);
                        setFormData({
                          ...formData,
                          departmentId: newDept,
                          courseId: available[0]?.id || '',
                          sectionId: ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Course *</label>
                    <select
                      required
                      value={formData.courseId}
                      onChange={(e) => {
                        const newCourse = e.target.value;
                        setFormData({
                          ...formData,
                          courseId: newCourse,
                          sectionId: ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">Select Course</option>
                      {courses
                        .filter((c) => !formData.departmentId || c.departmentId === formData.departmentId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Section</label>
                    <select
                      value={formData.sectionId}
                      onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">Select Section (Optional)</option>
                      {sections
                        .filter((s) => !formData.courseId || s.courseId === formData.courseId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Semester {s.semester})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admission Date</label>
                    <input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Student Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Residential address / Hostel"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Parent / Guardian Information */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      2. Parent / Guardian Information & Portal Access
                    </h4>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setParentMode('NEW')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                        parentMode === 'NEW'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      New Parent Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentMode('EXISTING')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                        parentMode === 'EXISTING'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link Existing Parent
                    </button>
                  </div>
                </div>

                {parentMode === 'EXISTING' ? (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                    <p className="text-xs text-indigo-900 font-medium">
                      Enter the existing parent's verified mobile number or Parent ID (e.g. <code>PRN-2026-0001</code>). This student will be linked to that parent's profile.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Parent ID or Verified Mobile *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.existingParentIdentifier}
                          onChange={(e) => setFormData({ ...formData, existingParentIdentifier: e.target.value })}
                          placeholder="e.g. PRN-2026-0001 or 9876543210"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Relationship to Student *</label>
                        <select
                          value={formData.parentRelationship}
                          onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          Parent / Guardian Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.parentName}
                          onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Relationship to Student *</label>
                        <select
                          value={formData.parentRelationship}
                          onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Primary Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.parentPhone}
                          onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                          placeholder="+91 9876543210 or 9876543210"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Parent universal login & SMS alert phone
                        </span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Alternate Mobile (Optional)</label>
                        <input
                          type="tel"
                          value={formData.parentAlternatePhone}
                          onChange={(e) => setFormData({ ...formData, parentAlternatePhone: e.target.value })}
                          placeholder="Secondary contact number"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Emergency Phone (Optional)</label>
                        <input
                          type="tel"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          placeholder="Emergency hotline"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Email Address <span className="font-normal text-slate-400">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={formData.parentEmail}
                          onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                          placeholder="Optional parent email"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Never required; admission is never blocked
                        </span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Occupation (Optional)</label>
                        <input
                          type="text"
                          value={formData.parentOccupation}
                          onChange={(e) => setFormData({ ...formData, parentOccupation: e.target.value })}
                          placeholder="e.g. Chartered Accountant, Civil Servant"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-3">
                        <label className="block font-bold text-slate-700 mb-1">Parent Residential Address (Optional)</label>
                        <input
                          type="text"
                          value={formData.parentAddress}
                          onChange={(e) => setFormData({ ...formData, parentAddress: e.target.value })}
                          placeholder="Leave blank to use student residential address"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60 flex items-center space-x-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>Complete Student Admission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admission & Credential Slip Modal */}
      {admissionSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-fadeIn">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Student Enrolled & Credentials Generated
                </h3>
                <p className="text-xs text-slate-500">
                  Provide these credentials to the student and parent. Both can log into EDUNEX immediately.
                </p>
              </div>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Student Credentials Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-indigo-700" />
                  <span className="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">
                    Student Credentials
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Student ID</span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {admissionSlip.studentId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(admissionSlip.studentId, 'studentId')}
                        className="p-1 rounded hover:bg-indigo-100 text-indigo-600"
                        title="Copy Student ID"
                      >
                        {copiedKey === 'studentId' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Admission Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5">
                      {admissionSlip.studentAdmissionNumber}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-between pt-1 border-t border-indigo-100">
                    <div>
                      <span className="text-[10px] text-indigo-700 font-bold block">
                        Temporary Password
                      </span>
                      <span className="font-mono font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200 text-xs">
                        {admissionSlip.studentTemporaryPassword}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(admissionSlip.studentTemporaryPassword, 'studentPassword')
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 flex items-center space-x-1"
                    >
                      {copiedKey === 'studentPassword' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Parent Credentials Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                    Parent Account & Credentials ({admissionSlip.parentAccountStatus === 'CREATED' ? 'New Account' : 'Existing Linked Account'})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Parent Name</span>
                    <span className="font-bold text-slate-900 text-xs block mt-0.5">
                      {admissionSlip.parentName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">Parent ID</span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {admissionSlip.parentId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(admissionSlip.parentId, 'parentId')}
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                        title="Copy Parent ID"
                      >
                        {copiedKey === 'parentId' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Registered Mobile Number (Universal Login)
                    </span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {admissionSlip.parentPhone}
                      </span>
                      <button
                        onClick={() => copyToClipboard(admissionSlip.parentPhone, 'parentPhone')}
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                        title="Copy Phone"
                      >
                        {copiedKey === 'parentPhone' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {admissionSlip.parentTemporaryPassword ? (
                    <div className="col-span-2 flex items-center justify-between pt-1 border-t border-emerald-100">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-bold block">
                          Temporary One-Time Password
                        </span>
                        <span className="font-mono font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {admissionSlip.parentTemporaryPassword}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(admissionSlip.parentTemporaryPassword!, 'parentPassword')
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center space-x-1"
                      >
                        {copiedKey === 'parentPassword' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copy</span>
                      </button>
                    </div>
                  ) : (
                    <div className="col-span-2 p-2 rounded-xl bg-white/70 border border-emerald-200 text-emerald-800 text-[11px]">
                      Student linked to pre-existing verified parent account. The parent can log in with their existing password.
                    </div>
                  )}
                </div>
              </div>

              {/* Security Advisory */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <span className="font-bold block mb-0.5">Universal Authentication Note:</span>
                Both the student and parent can log into the EDUNEX portal using their generated ID or registered phone number with the temporary password.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAdmissionSlip(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="e.g. O+, A+"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const available = courses.filter((c) => !newDept || c.departmentId === newDept);
                      setFormData({
                        ...formData,
                        departmentId: newDept,
                        courseId: available[0]?.id || '',
                        sectionId: ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      const newCourse = e.target.value;
                      setFormData({
                        ...formData,
                        courseId: newCourse,
                        sectionId: ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Select Course</option>
                    {courses
                      .filter((c) => !formData.departmentId || c.departmentId === formData.departmentId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Select Section (Optional)</option>
                    {sections
                      .filter((s) => !formData.courseId || s.courseId === formData.courseId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Semester {s.semester})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Credential Slip Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">{resetModalData.title}</h3>
              </div>
              <button
                onClick={() => setResetModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Account Holder</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {resetModalData.targetName}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-medium block">Identifier / User ID</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {resetModalData.identifier}
                  </span>
                  <button
                    onClick={() => copyToClipboard(resetModalData.identifier, 'resetId')}
                    className="p-1 rounded hover:bg-amber-100 text-amber-700"
                    title="Copy Identifier"
                  >
                    {copiedKey === 'resetId' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60">
                <span className="text-[10px] text-amber-800 font-bold block mb-1">
                  New Temporary One-Time Password
                </span>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-300">
                  <span className="font-mono font-bold text-amber-950 text-sm tracking-wide">
                    {resetModalData.temporaryPassword}
                  </span>
                  <button
                    onClick={() => copyToClipboard(resetModalData.temporaryPassword, 'tempPass')}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center space-x-1"
                  >
                    {copiedKey === 'tempPass' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-amber-700 leading-relaxed italic">
                {resetModalData.policyNote || 'Temporary credential. The user will be required to set a permanent password upon first login.'}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setResetModalData(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
