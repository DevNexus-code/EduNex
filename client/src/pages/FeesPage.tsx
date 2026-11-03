import React, { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  AlertCircle,
  DollarSign,
  Receipt,
  Printer,
  X,
  Search,
  CheckCircle2,
  Layers,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { FeeStructure, FeePayment, Student, Course, AcademicYear, FeeCategory } from '../types';

export const FeesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balances' | 'payments' | 'structures'>('balances');
  const [balances, setBalances] = useState<Array<{ studentId: string; studentName: string; courseName: string; totalFees: number; totalPaid: number; balance: number }>>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<FeePayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    feeStructureId: '',
    amountPaid: 500,
    paymentMethod: 'CASH',
    transactionRef: '',
    remarks: ''
  });

  // Structure Modal State
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [structureSubmitting, setStructureSubmitting] = useState(false);
  const [structureForm, setStructureForm] = useState({
    courseId: '',
    categoryId: '',
    amount: 1500,
    academicYear: '2026-2027',
    academicYearId: '',
    dueDate: '',
    semester: 1
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balancesRes, paymentsRes, structuresRes, studentsRes, coursesRes, yearsRes, categoriesRes] = await Promise.all([
        api.fees.getStudentBalances(),
        api.fees.getPayments(),
        api.fees.getStructures(),
        api.students.list({ status: 'ACTIVE' }),
        api.academics.getCourses().catch(() => [] as Course[]),
        api.academics.getAcademicYears().catch(() => [] as AcademicYear[]),
        api.fees.getCategories().catch(() => [] as FeeCategory[])
      ]);
      setBalances(balancesRes);
      setPayments(paymentsRes);
      setStructures(structuresRes);
      setStudents(studentsRes);
      setCourses(coursesRes);
      setAcademicYears(yearsRes);
      setCategories(categoriesRes);

      if (studentsRes[0] && !paymentForm.studentId) {
        setPaymentForm((prev) => ({ ...prev, studentId: studentsRes[0].id }));
      }
      if (structuresRes[0] && !paymentForm.feeStructureId) {
        setPaymentForm((prev) => ({ ...prev, feeStructureId: structuresRes[0].id }));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load fee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute selected student's balance info
  const selectedStudentBalance = balances.find((b) => b.studentId === paymentForm.studentId)?.balance ?? 0;
  const isOverpaying = paymentForm.amountPaid > selectedStudentBalance && selectedStudentBalance > 0;
  const isZeroBalance = selectedStudentBalance <= 0;
  const remainingAfterPayment = Math.max(0, selectedStudentBalance - (Number(paymentForm.amountPaid) || 0));

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.studentId || paymentForm.amountPaid <= 0) return;

    if (isOverpaying) {
      alert(`Amount exceeds outstanding balance ($${selectedStudentBalance.toLocaleString()}). Server will reject this payment.`);
      return;
    }

    if (isZeroBalance) {
      alert('Selected student has zero outstanding balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdPayment = await api.fees.recordPayment({
        studentId: paymentForm.studentId,
        feeStructureId: paymentForm.feeStructureId || undefined,
        amountPaid: Number(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        transactionRef: paymentForm.transactionRef || undefined,
        remarks: paymentForm.remarks || undefined
      });

      setShowPaymentModal(false);
      setSelectedReceipt(createdPayment);
      setShowReceiptModal(true);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record fee payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRecordForStudent = (studentId: string) => {
    const studentBal = balances.find((b) => b.studentId === studentId)?.balance ?? 0;
    setPaymentForm((prev) => ({
      ...prev,
      studentId,
      amountPaid: studentBal > 0 ? studentBal : 100
    }));
    setShowPaymentModal(true);
  };

  const openAddStructureModal = () => {
    setEditingStructure(null);
    setStructureForm({
      courseId: courses[0]?.id || '',
      categoryId: categories[0]?.id || '',
      amount: 1500,
      academicYear: academicYears.find((y) => y.isCurrent)?.name || '2026-2027',
      academicYearId: academicYears.find((y) => y.isCurrent)?.id || '',
      dueDate: '',
      semester: 1
    });
    setShowStructureModal(true);
  };

  const openEditStructureModal = (st: FeeStructure) => {
    setEditingStructure(st);
    setStructureForm({
      courseId: st.courseId,
      categoryId: st.categoryId,
      amount: st.amount,
      academicYear: typeof st.academicYear === 'string' ? st.academicYear : st.academicYear?.name || '2026-2027',
      academicYearId: st.academicYearId || '',
      dueDate: st.dueDate ? st.dueDate.split('T')[0] : '',
      semester: st.semester || 1
    });
    setShowStructureModal(true);
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureForm.courseId || !structureForm.categoryId || Number(structureForm.amount) <= 0) {
      alert('Please fill all required fields.');
      return;
    }

    setStructureSubmitting(true);
    try {
      if (editingStructure) {
        await api.fees.updateStructure(editingStructure.id, {
          courseId: structureForm.courseId,
          categoryId: structureForm.categoryId,
          amount: Number(structureForm.amount),
          dueDate: structureForm.dueDate || undefined,
          semester: Number(structureForm.semester)
        });
      } else {
        await api.fees.createStructure({
          courseId: structureForm.courseId,
          categoryId: structureForm.categoryId,
          amount: Number(structureForm.amount),
          academicYear: structureForm.academicYear,
          academicYearId: structureForm.academicYearId || undefined,
          dueDate: structureForm.dueDate || undefined,
          semester: Number(structureForm.semester)
        });
      }
      setShowStructureModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save fee structure.');
    } finally {
      setStructureSubmitting(false);
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fee structure? This action cannot be undone.')) return;
    try {
      await api.fees.deleteStructure(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete fee structure. It may be linked to existing payments.');
    }
  };

  const filteredBalances = balances.filter(
    (b) =>
      b.studentName.toLowerCase().includes(search.toLowerCase()) ||
      b.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fees & Billing Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Course fee schedules, outstanding balance reconciliations, and official payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'structures' && (
            <button
              onClick={openAddStructureModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fee Structure</span>
            </button>
          )}
          <button
            onClick={() => {
              if (students[0]) {
                const bal = balances.find((b) => b.studentId === students[0].id)?.balance ?? 0;
                setPaymentForm((prev) => ({
                  ...prev,
                  studentId: students[0].id,
                  amountPaid: bal > 0 ? bal : 500
                }));
              }
              setShowPaymentModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Fee Payment</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Student Fee Balances ({balances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Receipts History ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'structures'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fee Structures ({structures.length})</span>
        </button>
      </div>

      {/* Tab 1: Student Fee Balances */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center">
            <Search className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or course..."
              className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="mt-2 text-xs text-slate-500 font-semibold">Loading student fee ledger...</p>
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No records available yet.</p>
                <p className="text-xs text-slate-400">Records will appear when fee payments or admissions are recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Enrolled Course</th>
                      <th className="py-3 px-4">Total Course Fees</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Remaining Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBalances.map((b) => (
                      <tr key={b.studentId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{b.studentName}</td>
                        <td className="py-3.5 px-4 text-slate-600">{b.courseName}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">${b.totalFees.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">
                          ${b.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {b.balance > 0 ? (
                            <span className="text-rose-600">${b.balance.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600">$0 (Cleared)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {b.balance === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Paid in Full
                            </span>
                          ) : b.totalPaid > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              Partial Dues
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openRecordForStudent(b.studentId)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                          >
                            Collect Payment
                          </button>
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

      {/* Tab 2: Payments Receipts History */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No payment receipts issued yet.</p>
              <p className="text-xs text-slate-400">Records will appear when users record fee payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Fee Category</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{p.receiptNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.student ? `${p.student.firstName} ${p.student.lastName}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.feeStructure?.category?.name || 'General Tuition'}</td>
                      <td className="py-3 px-4 font-black text-slate-900">${p.amountPaid.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReceipt(p);
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-semibold inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fee Structures */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          {structures.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No fee structures configured yet.</p>
              <p className="text-xs text-slate-400">Click &quot;Add Fee Structure&quot; above to configure fee schedules for courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((st) => (
                <div key={st.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs">
                        {st.frequency || 'SEMESTER'}
                      </span>
                      <span className="text-base font-black text-slate-900">${st.amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{st.category?.name || 'Tuition Fee'}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">{st.course?.name || 'All Courses'}</p>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span>Academic Session:</span>
                        <span className="font-semibold text-slate-700">
                          {typeof st.academicYear === 'string' ? st.academicYear : st.academicYear?.name || '2026-2027'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Semester:</span>
                        <span className="font-semibold text-slate-700">Semester {st.semester || 1}</span>
                      </div>
                      {st.dueDate && (
                        <div className="flex items-center justify-between">
                          <span>Due Date:</span>
                          <span className="font-semibold text-amber-700">{st.dueDate.split('T')[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => openEditStructureModal(st)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-semibold inline-flex items-center space-x-1 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteStructure(st.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold inline-flex items-center space-x-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Fee Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
              <button onClick={() => setShowStructureModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course *</label>
                <select
                  required
                  value={structureForm.courseId}
                  onChange={(e) => setStructureForm({ ...structureForm, courseId: e.target.value })}
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
                <label className="block font-bold text-slate-700 mb-1">Fee Category *</label>
                <select
                  required
                  value={structureForm.categoryId}
                  onChange={(e) => setStructureForm({ ...structureForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={structureForm.amount}
                    onChange={(e) => setStructureForm({ ...structureForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={structureForm.semester}
                    onChange={(e) => setStructureForm({ ...structureForm, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Session</label>
                  <select
                    value={structureForm.academicYearId || structureForm.academicYear}
                    onChange={(e) => {
                      const selectedYear = academicYears.find((y) => y.id === e.target.value);
                      if (selectedYear) {
                        setStructureForm({
                          ...structureForm,
                          academicYearId: selectedYear.id,
                          academicYear: selectedYear.name
                        });
                      } else {
                        setStructureForm({
                          ...structureForm,
                          academicYear: e.target.value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  >
                    {academicYears.length > 0 ? (
                      academicYears.map((ay) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.name} {ay.isCurrent ? '(Current)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="2026-2027">2026-2027</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={structureForm.dueDate}
                    onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={structureSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60"
                >
                  {structureSubmitting ? 'Saving...' : editingStructure ? 'Update Structure' : 'Create Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Fee Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student *</label>
                <select
                  required
                  value={paymentForm.studentId}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    const bal = balances.find((b) => b.studentId === studentId)?.balance ?? 0;
                    setPaymentForm((prev) => ({
                      ...prev,
                      studentId,
                      amountPaid: bal > 0 ? bal : 500
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Outstanding Balance Banner */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Current Outstanding Balance:</span>
                  <span className={`font-black text-sm ${selectedStudentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ${selectedStudentBalance.toLocaleString()}
                  </span>
                </div>
                {isZeroBalance && (
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    Student has settled all fee obligations ($0 pending balance).
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Category / Structure</label>
                <select
                  value={paymentForm.feeStructureId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, feeStructureId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                >
                  <option value="">General Payment / Tuition</option>
                  {structures.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.category?.name || 'Tuition'} - ${st.amount} ({st.course?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid ($) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedStudentBalance > 0 ? selectedStudentBalance : undefined}
                    step="0.01"
                    required
                    value={paymentForm.amountPaid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-xl font-bold ${
                      isOverpaying ? 'border-rose-500 text-rose-700 bg-rose-50/50' : 'border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-900"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE_UPI">Online UPI</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              {/* Overpayment Warning */}
              {isOverpaying && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Amount exceeds outstanding balance of ${selectedStudentBalance.toLocaleString()}. Server will strictly reject this payment.</span>
                </div>
              )}

              {/* Live Remaining Balance Preview */}
              <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-semibold">Remaining balance after payment:</span>
                <span className="font-black text-indigo-700">${remainingAfterPayment.toLocaleString()}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                  placeholder="e.g. TXN-89218291 / CHQ-10492"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  placeholder="Notes, scholarship reference, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isOverpaying || isZeroBalance || paymentForm.amountPaid <= 0}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Generate Receipt & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            {/* Receipt Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900">EDUNEX ACADEMIC INSTITUTION</h2>
              <p className="text-xs text-slate-500">Official Campus Fee Collection Receipt</p>
              <div className="pt-2">
                <span className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                  {selectedReceipt.receiptNumber}
                </span>
              </div>
            </div>

            {/* Receipt Details Table */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">
                  {selectedReceipt.student
                    ? `${selectedReceipt.student.firstName} ${selectedReceipt.student.lastName}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Student ID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedReceipt.student?.studentId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedReceipt.paymentDate).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
              </div>
              {selectedReceipt.transactionRef && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono text-slate-800">{selectedReceipt.transactionRef}</span>
                </div>
              )}
              {selectedReceipt.balanceDue !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Outstanding Balance:</span>
                  <span className="font-semibold text-slate-800">${selectedReceipt.balanceDue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm">
                <span className="font-black text-slate-900">Total Amount Paid:</span>
                <span className="font-black text-indigo-600">${selectedReceipt.amountPaid.toFixed(2)}</span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-emerald-600 font-bold flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Verified & Recorded in Ledger
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
