import React, { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  Trash2,
  X,
  Upload
} from 'lucide-react';
import { api } from '../api/client';
import { Document, Student, Staff, DocumentType } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState('');

  // Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [docOwnerType, setDocOwnerType] = useState<'student' | 'staff' | 'general'>('student');
  const [formData, setFormData] = useState({
    title: '',
    documentType: 'ADMISSION_FORM' as DocumentType,
    fileUrl: '',
    studentId: '',
    staffId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, studentsRes, staffRes] = await Promise.all([
        api.documents.list({
          documentType: selectedType || undefined
        }),
        api.students.list({ status: 'ACTIVE' }),
        api.staff.list({ status: 'ACTIVE' })
      ]);
      setDocuments(docsRes);
      setStudents(studentsRes);
      setStaffList(staffRes);
      if (studentsRes[0]) setFormData((prev) => ({ ...prev, studentId: studentsRes[0].id }));
      if (staffRes[0]) setFormData((prev) => ({ ...prev, staffId: staffRes[0].id }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedType]);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.fileUrl) return;

    setIsSubmitting(true);
    try {
      await api.documents.uploadMeta({
        title: formData.title,
        documentType: formData.documentType,
        fileUrl: formData.fileUrl,
        studentId: docOwnerType === 'student' ? formData.studentId : undefined,
        staffId: docOwnerType === 'staff' ? formData.staffId : undefined
      });
      setShowUploadModal(false);
      setFormData({
        title: '',
        documentType: 'ADMISSION_FORM',
        fileUrl: '',
        studentId: students[0]?.id || '',
        staffId: staffList[0]?.id || ''
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document record?')) return;
    try {
      await api.documents.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Institutional Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Secure digital vault for student admission forms, transfer certificates, grade cards, and staff contracts.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {(
          [
            { label: 'All Documents', value: '' },
            { label: 'Admission Forms', value: 'ADMISSION_FORM' },
            { label: 'Grade Reports', value: 'GRADE_REPORT' },
            { label: 'ID Proofs', value: 'ID_PROOF' },
            { label: 'Transfer Certs', value: 'TRANSFER_CERTIFICATE' },
            { label: 'Staff Resumes', value: 'STAFF_RESUME' },
            { label: 'Contracts', value: 'CONTRACT' }
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setSelectedType(t.value)}
            className={`px-3 py-1.5 rounded-xl transition ${
              selectedType === t.value
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-500 font-semibold">Loading document repository...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No documents in repository yet.</p>
            <p className="text-xs text-slate-400">Records will appear when users create new activity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Owner / Recipient</th>
                  <th className="py-3 px-4">Uploaded Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{doc.title}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {doc.student ? (
                        <span>
                          Student: {doc.student.firstName} {doc.student.lastName} ({doc.student.studentId})
                        </span>
                      ) : doc.staff ? (
                        <span>
                          Staff: {doc.staff.firstName} {doc.staff.lastName} ({doc.staff.staffId})
                        </span>
                      ) : (
                        <span className="text-slate-400">General Institution</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload Document Record</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="e.g. High School Transcript, Offer Letter"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Category *</label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value as DocumentType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="ADMISSION_FORM">Admission Form</option>
                  <option value="GRADE_REPORT">Grade Report / Transcript</option>
                  <option value="ID_PROOF">National ID / Passport Proof</option>
                  <option value="TRANSFER_CERTIFICATE">Transfer Certificate (TC)</option>
                  <option value="MEDICAL_RECORD">Medical Record</option>
                  <option value="STAFF_RESUME">Staff Resume / CV</option>
                  <option value="CONTRACT">Employment Contract</option>
                  <option value="OTHER">Other Institutional Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Belongs To</label>
                <div className="flex gap-2 mb-2">
                  {(['student', 'staff', 'general'] as const).map((ot) => (
                    <button
                      key={ot}
                      type="button"
                      onClick={() => setDocOwnerType(ot)}
                      className={`px-3 py-1 rounded-lg capitalize font-bold text-[11px] ${
                        docOwnerType === ot ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ot}
                    </button>
                  ))}
                </div>

                {docOwnerType === 'student' && (
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.studentId})
                      </option>
                    ))}
                  </select>
                )}

                {docOwnerType === 'staff' && (
                  <select
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.staffId})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Storage URL *</label>
                <input
                  type="url"
                  required
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                  placeholder="https://...supabase.co/storage/v1/object/public/documents/..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save Document Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
