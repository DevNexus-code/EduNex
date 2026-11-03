import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Eye,
  X,
  Calendar
} from 'lucide-react';
import { api } from '../api/client';
import { Staff, Department, Subject } from '../types';
import { BookOpen } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectStaff, setSubjectStaff] = useState<Staff | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    category: 'TEACHING' as any,
    departmentId: '',
    designation: '',
    qualification: '',
    employmentType: 'FULL_TIME' as any,
    status: 'ACTIVE' as any,
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const filterParams: Record<string, string> = {};
      if (search.trim()) filterParams.search = search.trim();
      if (selectedDept) filterParams.departmentId = selectedDept;
      if (selectedCategory) filterParams.category = selectedCategory;
      if (selectedStatus) filterParams.status = selectedStatus;

      const [staffData, deptsData, subjectsData] = await Promise.all([
        api.staff.list(filterParams),
        api.academics.getDepartments(),
        api.academics.getSubjects()
      ]);
      setStaffList(staffData);
      setDepartments(deptsData);
      setAllSubjects(subjectsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedDept, selectedCategory, selectedStatus]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.designation) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.staff.create({
        ...formData,
        departmentId: formData.departmentId || undefined
      });
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to register staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      await api.staff.update(selectedStaff.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        designation: formData.designation,
        qualification: formData.qualification || undefined,
        employmentType: formData.employmentType,
        departmentId: formData.departmentId || null,
        category: formData.category,
        status: formData.status
      });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSubjectModal = (st: Staff) => {
    setSubjectStaff(st);
    setAssignedSubjectIds((st.assignedSubjects || []).map((s) => s.id));
    setShowSubjectModal(true);
  };

  const handleSaveSubjects = async () => {
    if (!subjectStaff) return;
    setIsSubmitting(true);
    try {
      await api.staff.assignSubjects(subjectStaff.id, assignedSubjectIds);
      setShowSubjectModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update assigned subjects.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveStaff = async (id: string) => {
    if (!confirm('Are you sure you want to mark this staff member as RESIGNED?')) return;
    try {
      await api.staff.archive(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to archive staff.');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      category: 'TEACHING' as any,
      departmentId: departments[0]?.id || '',
      designation: '',
      qualification: '',
      employmentType: 'FULL_TIME' as any,
      status: 'ACTIVE' as any,
      joiningDate: new Date().toISOString().split('T')[0]
    });
  };

  const openEdit = (st: Staff) => {
    setSelectedStaff(st);
    setFormData({
      firstName: st.firstName,
      lastName: st.lastName,
      email: st.email,
      phone: st.phone || '',
      category: st.category,
      departmentId: st.departmentId || '',
      designation: st.designation,
      qualification: st.qualification || '',
      employmentType: st.employmentType,
      status: st.status,
      joiningDate: st.joiningDate.split('T')[0]
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Faculty & Staff Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage institutional faculty members, administrative officers, and campus support staff.
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
          <span>Add Faculty / Staff</span>
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
            placeholder="Search by staff name, designation, or Staff ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="TEACHING">Teaching / Faculty</option>
            <option value="ADMINISTRATIVE">Administrative</option>
            <option value="NON_TEACHING">Non-Teaching</option>
            <option value="SUPPORT">Support</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="RESIGNED">Resigned</option>
            <option value="RETIRED">Retired</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {(search || selectedDept || selectedCategory || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedDept('');
                setSelectedCategory('');
                setSelectedStatus('');
              }}
              className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-500 font-semibold">Loading staff directory...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No records available yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Records will appear when users create new activity. Click "Add Faculty / Staff" to register personnel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Department & Designation</th>
                  <th className="py-3 px-4">Assigned Subjects</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{st.staffId}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        {st.firstName} {st.lastName}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{st.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {st.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{st.designation}</span>
                      <span className="text-[11px] text-slate-400 block">{st.department?.name || 'General Campus'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {st.category === 'TEACHING' ? (
                        st.assignedSubjects && st.assignedSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {st.assignedSubjects.map((sub) => (
                              <span
                                key={sub.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={`${sub.code} (${sub.course?.name || ''})`}
                              >
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No subjects assigned</span>
                        )
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {st.category === 'TEACHING' && (
                        <button
                          onClick={() => openSubjectModal(st)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                          title="Assign Curriculum Subjects"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedStaff(st)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(st)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveStaff(st.id)}
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

      {/* Staff Details Drawer */}
      {selectedStaff && !showEditModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedStaff.staffId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Institutional Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Designation</span>
                    <span className="font-semibold text-slate-900">{selectedStaff.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Department</span>
                    <span className="font-semibold text-slate-900">
                      {selectedStaff.department?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Category</span>
                    <span className="font-semibold text-slate-900">{selectedStaff.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Qualification</span>
                    <span className="font-semibold text-slate-900">{selectedStaff.qualification || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Contact Info</h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedStaff.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedStaff.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Joined: {new Date(selectedStaff.joiningDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {selectedStaff.category === 'TEACHING' && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">
                      Assigned Subjects ({selectedStaff.assignedSubjects?.length || 0})
                    </h4>
                    <button
                      onClick={() => openSubjectModal(selectedStaff)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Assign / Edit
                    </button>
                  </div>
                  {selectedStaff.assignedSubjects && selectedStaff.assignedSubjects.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedStaff.assignedSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-2 rounded-xl bg-white border border-indigo-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{sub.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {sub.code} • {sub.course?.name || 'General Course'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {sub.credits} Credits
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No syllabus subjects currently assigned.</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
              {selectedStaff.category === 'TEACHING' && (
                <button
                  onClick={() => openSubjectModal(selectedStaff)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs"
                >
                  Manage Subjects
                </button>
              )}
              <button
                onClick={() => openEdit(selectedStaff)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Edit Staff Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Faculty or Staff Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="TEACHING">Teaching / Faculty</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="NON_TEACHING">Non-Teaching</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Campus Wide / General</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="e.g. Assistant Professor, Bursar"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="e.g. Ph.D in Computer Science, MBA"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="ADJUNCT">Adjunct</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Registering...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Staff Record</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="py-4 space-y-4 text-xs">
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
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
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
                  <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="ADJUNCT">Adjunct</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Campus Wide / General</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="TEACHING">Teaching / Faculty</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="NON_TEACHING">Non-Teaching</option>
                    <option value="SUPPORT">Support</option>
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
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="RETIRED">Retired</option>
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

      {/* Assign Curriculum Subjects Modal */}
      {showSubjectModal && subjectStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign Curriculum Subjects</h3>
                <p className="text-xs text-slate-500">
                  Select which syllabus subjects {subjectStaff.firstName} {subjectStaff.lastName} teaches.
                </p>
              </div>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {allSubjects.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No subjects created in curriculum yet.</p>
              ) : (
                allSubjects.map((sub) => {
                  const isChecked = assignedSubjectIds.includes(sub.id);
                  return (
                    <label
                      key={sub.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedSubjectIds([...assignedSubjectIds, sub.id]);
                            } else {
                              setAssignedSubjectIds(assignedSubjectIds.filter((id) => id !== sub.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{sub.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {sub.code} • {sub.course?.name || 'General Course'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {sub.credits} Credits
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {assignedSubjectIds.length} subject{assignedSubjectIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveSubjects}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save Assigned Subjects'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
