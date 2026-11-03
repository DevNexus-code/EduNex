import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Edit2,
  Eye,
  X,
  UserCheck,
  KeyRound,
  CheckCircle2,
  Copy,
  UserPlus,
  UserMinus,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import { ParentRecord } from '../types';

export const ParentsPage: React.FC = () => {
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credential Modal State
  const [credentialSlip, setCredentialSlip] = useState<{
    parentId: string;
    parentName: string;
    parentPhone: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    relation: 'Father',
    phone: '',
    alternatePhone: '',
    emergencyPhone: '',
    email: '',
    address: '',
    occupation: '',
    isActive: true
  });

  // Link Student Input State
  const [studentIdentifierToLink, setStudentIdentifierToLink] = useState('');

  const fetchParents = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus) params.status = selectedStatus;

      const data = await api.parents.list(params);
      setParents(Array.isArray(data) ? data : (data as any)?.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load parents list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, [search, selectedStatus]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please provide parent full name and primary phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.parents.create({
        name: formData.name.trim(),
        relation: formData.relation,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        emergencyPhone: formData.emergencyPhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        occupation: formData.occupation.trim() || undefined
      });

      setShowAddModal(false);
      resetForm();
      fetchParents();

      // Show temporary credential slip if returned
      if (res.temporaryPassword) {
        setCredentialSlip({
          parentId: res.parent.parentId,
          parentName: res.parent.name,
          parentPhone: res.parent.phone,
          temporaryPassword: res.temporaryPassword
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create parent account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;

    setIsSubmitting(true);
    try {
      const updated = await api.parents.update(selectedParent.id, {
        name: formData.name.trim(),
        relation: formData.relation,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || null,
        emergencyPhone: formData.emergencyPhone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        occupation: formData.occupation.trim() || null,
        isActive: formData.isActive
      });

      setShowEditModal(false);
      setSelectedParent(updated);
      fetchParents();
    } catch (err: any) {
      alert(err.message || 'Failed to update parent details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (parent: ParentRecord) => {
    if (!window.confirm(`Reset temporary password for parent ${parent.name} (${parent.parentId})?`)) {
      return;
    }

    try {
      const res = await api.parents.resetPassword(parent.id);
      setCredentialSlip({
        parentId: res.parentId || parent.parentId,
        parentName: parent.name,
        parentPhone: parent.phone,
        temporaryPassword: res.temporaryPassword
      });
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent || !studentIdentifierToLink.trim()) return;

    setIsSubmitting(true);
    try {
      await api.parents.linkStudent(selectedParent.id, studentIdentifierToLink.trim());
      setStudentIdentifierToLink('');
      setShowLinkModal(false);
      // Refresh parent profile
      const updatedParent = await api.parents.getById(selectedParent.id);
      setSelectedParent(updatedParent);
      fetchParents();
    } catch (err: any) {
      alert(err.message || 'Failed to link student. Verify the Student ID or Admission Number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkStudent = async (studentId: string, studentName: string) => {
    if (!selectedParent) return;
    if (!window.confirm(`Unlink student ${studentName} from this parent account?`)) return;

    try {
      await api.parents.unlinkStudent(selectedParent.id, studentId);
      const updatedParent = await api.parents.getById(selectedParent.id);
      setSelectedParent(updatedParent);
      fetchParents();
    } catch (err: any) {
      alert(err.message || 'Failed to unlink student.');
    }
  };

  const openEdit = (parent: ParentRecord) => {
    setSelectedParent(parent);
    setFormData({
      name: parent.name,
      relation: parent.relation || 'Father',
      phone: parent.phone,
      alternatePhone: parent.alternatePhone || '',
      emergencyPhone: parent.emergencyPhone || '',
      email: parent.email && !parent.email.endsWith('@internal.edunex.local') ? parent.email : '',
      address: parent.address || '',
      occupation: parent.occupation || '',
      isActive: parent.isActive ?? true
    });
    setShowEditModal(true);
  };

  const openDetail = (parent: ParentRecord) => {
    setSelectedParent(parent);
    setShowDetailDrawer(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relation: 'Father',
      phone: '',
      alternatePhone: '',
      emergencyPhone: '',
      email: '',
      address: '',
      occupation: '',
      isActive: true
    });
  };

  const totalParents = parents.length;
  const activeParents = parents.filter((p) => p.isActive).length;
  const totalLinkedChildren = parents.reduce((acc, p) => acc + (p.students?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Parent Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Family Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage registered parent accounts, emergency contacts, linked children, and secure credential resets.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Register Parent</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Parents
            </span>
            <span className="text-xl font-black text-slate-900">{totalParents}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Accounts
            </span>
            <span className="text-xl font-black text-slate-900">{activeParents}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-violet-50 text-violet-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Linked Children
            </span>
            <span className="text-xl font-black text-slate-900">{totalLinkedChildren}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent name, Parent ID, mobile number, or linked Student ID..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
          {(search || selectedStatus) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('');
              }}
              className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchParents} className="font-bold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* Parents Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Loading parent directories...</span>
          </div>
        ) : parents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Parent Accounts Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || selectedStatus
                ? 'No parents matched your active filter criteria.'
                : 'Parent accounts are automatically generated during Student Admission, or you can manually register one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Parent ID</th>
                  <th className="py-3 px-4">Parent Name & Relation</th>
                  <th className="py-3 px-4">Verified Contact</th>
                  <th className="py-3 px-4">Linked Student(s)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parents.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 inline-block">
                        {p.parentId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-indigo-600 font-semibold">{p.relation || 'Parent'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.phone}</span>
                      </div>
                      {p.email && !p.email.endsWith('@internal.edunex.local') ? (
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-300" />
                          <span>{p.email}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No external email</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.students && p.students.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {p.students.map((st) => (
                            <span
                              key={st.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold"
                            >
                              <span>{st.name}</span>
                              <span className="text-indigo-400 font-mono">({st.studentId})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          0 Linked Children
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openDetail(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                        title="View Full Profile & Children"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedParent(p);
                          setShowLinkModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        title="Link Student"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                        title="Reset Temporary Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Parent Details & Linked Children Drawer */}
      {showDetailDrawer && selectedParent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedParent.name}</h3>
                  <p className="text-xs text-indigo-600 font-mono font-semibold">
                    {selectedParent.parentId} • {selectedParent.relation || 'Parent'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Contact Information */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Verified Contact Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Mobile</span>
                    <span className="font-semibold text-slate-900">{selectedParent.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Alternate Phone</span>
                    <span className="font-semibold text-slate-900">{selectedParent.alternatePhone || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Emergency Phone</span>
                    <span className="font-semibold text-slate-900">{selectedParent.emergencyPhone || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Occupation</span>
                    <span className="font-semibold text-slate-900">{selectedParent.occupation || 'Not specified'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Email</span>
                    <span className="font-semibold text-slate-900">
                      {selectedParent.email && !selectedParent.email.endsWith('@internal.edunex.local')
                        ? selectedParent.email
                        : 'No external email (Internal account)'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Residential Address</span>
                    <span className="font-semibold text-slate-900">{selectedParent.address || 'None provided'}</span>
                  </div>
                </div>
              </div>

              {/* Linked Children List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Linked Children ({selectedParent.students?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Another Child</span>
                  </button>
                </div>

                {selectedParent.students && selectedParent.students.length > 0 ? (
                  <div className="space-y-2">
                    {selectedParent.students.map((child) => (
                      <div
                        key={child.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{child.name}</span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {child.studentId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {child.course} • Section: {child.section}
                          </p>
                          <p className="text-[10px] text-slate-400">Adm No: {child.admissionNumber}</p>
                        </div>
                        <button
                          onClick={() => handleUnlinkStudent(child.id, child.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Unlink Student"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
                    No students currently linked to this parent account.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between space-x-2">
              <button
                onClick={() => handleResetPassword(selectedParent)}
                className="px-3 py-2 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 font-bold text-xs flex items-center space-x-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  openEdit(selectedParent);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Edit Parent Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register Parent / Guardian</h3>
                <p className="text-xs text-slate-500">
                  Creates an institutional parent account and generates secure temporary login credentials.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Parent/Guardian Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar Sharma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Relationship to Student *</label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210 or 9876543210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Used for universal login & SMS notices</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alternate Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    placeholder="Secondary contact number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="Emergency hotline"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Optional parent email"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Occupation (Optional)</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Engineer, Business, Physician"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Residential Address (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House/Street, City, State, PIN"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Account & Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Parent Modal */}
      {showEditModal && selectedParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Parent Details</h3>
                <p className="text-xs text-slate-500 font-mono">Parent ID: {selectedParent.parentId}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateParent} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Parent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={formData.alternatePhone}
                    onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Optional parent email"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="isActiveCheckbox" className="font-semibold text-slate-700">
                    Account is Active (enables portal authentication)
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Student Modal */}
      {showLinkModal && selectedParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Link Student to Parent</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkStudent} className="py-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block">Parent</span>
                <span className="font-bold text-slate-900">{selectedParent.name}</span>
                <span className="font-mono text-[10px] text-indigo-600 block">({selectedParent.parentId})</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Student ID or Admission Number *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. STD-2026-0001 or ADM-2026-0001"
                  value={studentIdentifierToLink}
                  onChange={(e) => setStudentIdentifierToLink(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enter the exact student identifier to associate them with this parent profile.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center space-x-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credential Slip Modal */}
      {credentialSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Parent Credential Generated</h3>
                <p className="text-xs text-slate-500">Provide this temporary credential to the parent.</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Parent Full Name
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{credentialSlip.parentName}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Universal Parent ID
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {credentialSlip.parentId}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentialSlip.parentId, 'parentId')}
                    className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition"
                    title="Copy Parent ID"
                  >
                    {copiedKey === 'parentId' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Registered Mobile Number
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {credentialSlip.parentPhone}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentialSlip.parentPhone, 'phone')}
                    className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition"
                    title="Copy Mobile"
                  >
                    {copiedKey === 'phone' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Temporary One-Time Password
                    </span>
                    <span className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200 text-sm">
                      {credentialSlip.temporaryPassword}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(credentialSlip.temporaryPassword, 'password')}
                    className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition"
                    title="Copy Temporary Password"
                  >
                    {copiedKey === 'password' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <span className="font-bold block mb-0.5">Security Notice:</span>
                The parent can log in at the EDUNEX portal using either their <strong>Parent ID</strong> or their <strong>Registered Mobile Number</strong> alongside this temporary password. They will be prompted to choose a permanent private password on their first login.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setCredentialSlip(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Dismiss Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
