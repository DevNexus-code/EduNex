import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  AlertCircle,
  Calendar,
  Layers,
  Building2,
  X,
  Pencil,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../api/client';
import { Department, Course, Subject, AcademicYear, ClassSection, Staff, CourseType } from '../types';

export const AcademicsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'subjects' | 'years_sections'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [courseDeptFilter, setCourseDeptFilter] = useState('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState('');
  const [subjectCourseFilter, setSubjectCourseFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Editing states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    headOfDepartment: '',
    email: '',
    phone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    type: 'UNDERGRADUATE' as CourseType,
    departmentId: '',
    durationYears: 4,
    totalSemesters: 8,
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    courseId: '',
    semester: 1,
    credits: 3,
    isElective: false,
    teacherId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Section Modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<ClassSection | null>(null);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    courseId: '',
    academicYearId: '',
    semester: 1,
    capacity: 60,
    classTeacherId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Academic Year Modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearForm, setYearForm] = useState({
    name: '2026-2027',
    startDate: '2026-08-01',
    endDate: '2027-05-31',
    isCurrent: false
  });

  const fetchAll = async () => {
    try {
      const [deptRes, courseRes, subjRes, yearsRes, secRes, staffRes] = await Promise.all([
        api.academics.getDepartments(),
        api.academics.getCourses(),
        api.academics.getSubjects(),
        api.academics.getAcademicYears(),
        api.academics.getSections(),
        api.staff.list({ category: 'TEACHING', status: 'ACTIVE' }).catch(() => [] as Staff[])
      ]);
      setDepartments(deptRes);
      setCourses(courseRes);
      setSubjects(subjRes);
      setAcademicYears(yearsRes);
      setSections(secRes);
      setTeachers(staffRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load academic records.');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Department Handlers
  const openAddDeptModal = () => {
    setEditingDept(null);
    setDeptForm({
      name: '',
      code: '',
      description: '',
      headOfDepartment: '',
      email: '',
      phone: '',
      status: 'ACTIVE'
    });
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      headOfDepartment: dept.headOfDepartment || '',
      email: dept.email || '',
      phone: dept.phone || '',
      status: dept.status || 'ACTIVE'
    });
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDept) {
        await api.academics.updateDepartment(editingDept.id, deptForm);
      } else {
        await api.academics.createDepartment(deptForm);
      }
      setShowDeptModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeptStatus = async (dept: Department) => {
    const nextStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.academics.updateDepartment(dept.id, { status: nextStatus });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update department status.');
    }
  };

  // Course Handlers
  const openAddCourseModal = () => {
    setEditingCourse(null);
    setCourseForm({
      name: '',
      code: '',
      type: 'UNDERGRADUATE',
      departmentId: departments[0]?.id || '',
      durationYears: 4,
      totalSemesters: 8,
      description: '',
      status: 'ACTIVE'
    });
    setShowCourseModal(true);
  };

  const openEditCourseModal = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      code: course.code,
      type: course.type,
      departmentId: course.departmentId,
      durationYears: course.durationYears,
      totalSemesters: course.totalSemesters,
      description: course.description || '',
      status: course.status || 'ACTIVE'
    });
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCourse) {
        await api.academics.updateCourse(editingCourse.id, courseForm);
      } else {
        await api.academics.createCourse(courseForm);
      }
      setShowCourseModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCourseStatus = async (course: Course) => {
    const nextStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.academics.updateCourse(course.id, { status: nextStatus });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update course status.');
    }
  };

  // Subject Handlers
  const openAddSubjectModal = () => {
    setEditingSubject(null);
    setSubjectForm({
      name: '',
      code: '',
      departmentId: departments[0]?.id || '',
      courseId: courses[0]?.id || '',
      semester: 1,
      credits: 3,
      isElective: false,
      teacherId: '',
      status: 'ACTIVE'
    });
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (sub: Subject) => {
    setEditingSubject(sub);
    setSubjectForm({
      name: sub.name,
      code: sub.code,
      departmentId: sub.departmentId || '',
      courseId: sub.courseId,
      semester: sub.semester,
      credits: sub.credits,
      isElective: sub.isElective,
      teacherId: sub.teacherId || '',
      status: sub.status || 'ACTIVE'
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await api.academics.updateSubject(editingSubject.id, subjectForm);
      } else {
        await api.academics.createSubject(subjectForm);
      }
      setShowSubjectModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubjectStatus = async (sub: Subject) => {
    const nextStatus = sub.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.academics.updateSubject(sub.id, { status: nextStatus });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update subject status.');
    }
  };

  // Section Handlers
  const openAddSectionModal = () => {
    setEditingSection(null);
    setSectionForm({
      name: '',
      courseId: courses[0]?.id || '',
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || '',
      semester: 1,
      capacity: 60,
      classTeacherId: '',
      status: 'ACTIVE'
    });
    setShowSectionModal(true);
  };

  const openEditSectionModal = (sec: ClassSection) => {
    setEditingSection(sec);
    setSectionForm({
      name: sec.name,
      courseId: sec.courseId,
      academicYearId: sec.academicYearId || '',
      semester: sec.semester,
      capacity: sec.capacity,
      classTeacherId: sec.classTeacherId || '',
      status: sec.status || 'ACTIVE'
    });
    setShowSectionModal(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSection) {
        await api.academics.updateSection(editingSection.id, sectionForm);
      } else {
        await api.academics.createSection(sectionForm);
      }
      setShowSectionModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSectionStatus = async (sec: ClassSection) => {
    const nextStatus = sec.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.academics.updateSection(sec.id, { status: nextStatus });
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update section status.');
    }
  };

  // Academic Year Handlers
  const openAddYearModal = () => {
    setEditingYear(null);
    setYearForm({
      name: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      isCurrent: false
    });
    setShowYearModal(true);
  };

  const openEditYearModal = (year: AcademicYear) => {
    setEditingYear(year);
    setYearForm({
      name: year.name,
      startDate: year.startDate.split('T')[0],
      endDate: year.endDate.split('T')[0],
      isCurrent: year.isCurrent
    });
    setShowYearModal(true);
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingYear) {
        await api.academics.updateAcademicYear(editingYear.id, yearForm);
      } else {
        await api.academics.createAcademicYear(yearForm);
      }
      setShowYearModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save academic year.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetCurrentYear = async (id: string) => {
    try {
      await api.academics.setCurrentAcademicYear(id);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Failed to set current academic year.');
    }
  };

  // Filtered views
  const filteredCourses = courses.filter((c) => {
    const matchesDept = !courseDeptFilter || c.departmentId === courseDeptFilter;
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const filteredSubjects = subjects.filter((s) => {
    const matchesDept = !subjectDeptFilter || s.departmentId === subjectDeptFilter;
    const matchesCourse = !subjectCourseFilter || s.courseId === subjectCourseFilter;
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesCourse && matchesSearch;
  });

  const filteredDepartments = departments.filter((d) => {
    return !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Academic Structure & Curriculum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure academic departments, degree programs, curriculum subjects, academic sessions, and classroom sections.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold overflow-x-auto pb-0.5">
        <button
          onClick={() => { setActiveTab('departments'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('courses'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses ({courses.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('subjects'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Subjects ({subjects.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('years_sections'); setSearchTerm(''); }}
          className={`pb-3 flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'years_sections'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Academic Sessions & Sections ({sections.length})</span>
        </button>
      </div>

      {/* Tab 1: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search departments by name or code..."
                className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <button
              onClick={openAddDeptModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Head of Dept</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{d.code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{d.name}</div>
                        {d.description && <div className="text-[11px] text-slate-400 font-normal mt-0.5">{d.description}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{d.headOfDepartment || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div>{d.email || '—'}</div>
                        <div>{d.phone || ''}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            d.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {d.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => toggleDeptStatus(d)}
                          title={d.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                            d.status === 'ACTIVE'
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditDeptModal(d)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-[11px] font-bold inline-flex items-center space-x-1 transition"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-600">Department:</span>
                <select
                  value={courseDeptFilter}
                  onChange={(e) => setCourseDeptFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={openAddCourseModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Course</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Course Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Duration & Semesters</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{c.department?.name || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.durationYears} Years • {c.totalSemesters} Semesters
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {c.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => toggleCourseStatus(c)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                            c.status === 'ACTIVE'
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditCourseModal(c)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-[11px] font-bold inline-flex items-center space-x-1 transition"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Subjects */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search subjects..."
                  className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
                <span className="font-bold text-slate-600">Dept:</span>
                <select
                  value={subjectDeptFilter}
                  onChange={(e) => {
                    setSubjectDeptFilter(e.target.value);
                    setSubjectCourseFilter('');
                  }}
                  className="bg-transparent font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Filter */}
              <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
                <span className="font-bold text-slate-600">Course:</span>
                <select
                  value={subjectCourseFilter}
                  onChange={(e) => setSubjectCourseFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="">All Courses</option>
                  {courses
                    .filter((c) => !subjectDeptFilter || c.departmentId === subjectDeptFilter)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button
              onClick={openAddSubjectModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Assigned Faculty</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((sub) => {
                    const assignedFaculty = teachers.find((t) => t.userId === sub.teacherId);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{sub.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{sub.course?.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">Semester {sub.semester}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{sub.credits} Credits</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {assignedFaculty ? `${assignedFaculty.firstName} ${assignedFaculty.lastName}` : 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {sub.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => toggleSubjectStatus(sub)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                              sub.status === 'ACTIVE'
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {sub.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openEditSubjectModal(sub)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-[11px] font-bold inline-flex items-center space-x-1 transition"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Academic Years & Sections */}
      {activeTab === 'years_sections' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Academic Years Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Academic Sessions</h3>
                  <p className="text-xs text-slate-500">Configure institutional academic years and active session.</p>
                </div>
                <button
                  onClick={openAddYearModal}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Session</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {academicYears.map((ay) => (
                  <div key={ay.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{ay.name}</span>
                        {ay.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Current Active Session
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(ay.startDate).toLocaleDateString()} — {new Date(ay.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {!ay.isCurrent && (
                        <button
                          onClick={() => handleSetCurrentYear(ay.id)}
                          className="px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold transition"
                        >
                          Set Current
                        </button>
                      )}
                      <button
                        onClick={() => openEditYearModal(ay)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-bold transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Class Sections List */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Class Sections</h3>
                  <p className="text-xs text-slate-500">Manage cohort batches, class teachers, and capacities.</p>
                </div>
                <button
                  onClick={openAddSectionModal}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {sections.map((sec) => (
                  <div key={sec.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{sec.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            sec.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sec.status || 'ACTIVE'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {sec.course?.name} • Semester {sec.semester} • Cap: {sec.capacity}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => toggleSectionStatus(sec)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition ${
                          sec.status === 'ACTIVE'
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {sec.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditSectionModal(sec)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-bold transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDept} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-medium"
                  placeholder="e.g. CSE"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Head of Department</label>
                <input
                  type="text"
                  value={deptForm.headOfDepartment}
                  onChange={(e) => setDeptForm({ ...deptForm, headOfDepartment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. Dr. Alan Turing"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={deptForm.email}
                    onChange={(e) => setDeptForm({ ...deptForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                    placeholder="dept@edunex.edu"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={deptForm.phone}
                    onChange={(e) => setDeptForm({ ...deptForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="Academic scope, mission, and degree programs..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCourse ? 'Edit Course' : 'Add Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. B.Tech in Artificial Intelligence"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-medium"
                  placeholder="e.g. BTECH-AI"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={courseForm.departmentId}
                  onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={courseForm.type}
                    onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value as CourseType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  >
                    <option value="UNDERGRADUATE">Undergraduate</option>
                    <option value="POSTGRADUATE">Postgraduate</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="CERTIFICATE">Certificate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={courseForm.durationYears}
                    onChange={(e) => setCourseForm({ ...courseForm, durationYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Semesters</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={courseForm.totalSemesters}
                  onChange={(e) => setCourseForm({ ...courseForm, totalSemesters: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button onClick={() => setShowSubjectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. Computer Networks"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-medium"
                  placeholder="e.g. CS301"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Enrolled Course *</label>
                <select
                  required
                  value={subjectForm.courseId}
                  onChange={(e) => {
                    const selCourse = courses.find((c) => c.id === e.target.value);
                    setSubjectForm({
                      ...subjectForm,
                      courseId: e.target.value,
                      departmentId: selCourse?.departmentId || subjectForm.departmentId
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Teacher</label>
                <select
                  value={subjectForm.teacherId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.userId || t.id}>
                      {t.firstName} {t.lastName} ({t.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isElectiveCheckbox"
                  checked={subjectForm.isElective}
                  onChange={(e) => setSubjectForm({ ...subjectForm, isElective: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="isElectiveCheckbox" className="font-semibold text-slate-700">
                  Elective Subject
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSection ? 'Edit Class Section' : 'Add Class Section'}
              </h3>
              <button onClick={() => setShowSectionModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSection} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. Section A"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course *</label>
                <select
                  required
                  value={sectionForm.courseId}
                  onChange={(e) => setSectionForm({ ...sectionForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Session *</label>
                <select
                  required
                  value={sectionForm.academicYearId}
                  onChange={(e) => setSectionForm({ ...sectionForm, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Session</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Teacher</label>
                <select
                  value={sectionForm.classTeacherId}
                  onChange={(e) => setSectionForm({ ...sectionForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.userId || t.id}>
                      {t.firstName} {t.lastName} ({t.designation || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={sectionForm.semester}
                    onChange={(e) => setSectionForm({ ...sectionForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={sectionForm.capacity}
                    onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingSection ? 'Update Section' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingYear ? 'Edit Academic Session' : 'Add Academic Session'}
              </h3>
              <button onClick={() => setShowYearModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveYear} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Name *</label>
                <input
                  type="text"
                  required
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  placeholder="e.g. 2026-2027"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isCurrentYearCheckbox"
                  checked={yearForm.isCurrent}
                  onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="isCurrentYearCheckbox" className="font-semibold text-slate-700">
                  Set as Current Active Session
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowYearModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60 transition"
                >
                  {isSubmitting ? 'Saving...' : editingYear ? 'Update Session' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
