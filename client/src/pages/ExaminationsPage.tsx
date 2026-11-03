import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle2,
  X,
  Award,
  GraduationCap
} from 'lucide-react';
import { api } from '../api/client';
import { Examination, Student, AcademicYear, Subject, StudentMark } from '../types';
import { ExamStatusBadge } from '../components/common/Badges';

export const ExaminationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exams' | 'marks_entry' | 'results'>('exams');
  const [exams, setExams] = useState<Examination[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<StudentMark[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showExamModal, setShowExamModal] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Marks Entry State
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [marksMap, setMarksMap] = useState<Record<string, { marksObtained: number; remarks: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [examForm, setExamForm] = useState({
    title: '',
    academicYearId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });

  const [paperForm, setPaperForm] = useState({
    examinationId: '',
    subjectId: '',
    examDate: new Date().toISOString().split('T')[0],
    maxMarks: 100,
    passingMarks: 40,
    roomNumber: 'Hall A-101'
  });

  const fetchData = async () => {
    try {

      const [examsRes, yearsRes, subjRes, studentsRes, resultsRes] = await Promise.all([
        api.examinations.list(),
        api.academics.getAcademicYears(),
        api.academics.getSubjects(),
        api.students.list({ status: 'ACTIVE' }),
        api.examinations.getResults()
      ]);
      setExams(examsRes);
      setAcademicYears(yearsRes);
      setSubjects(subjRes);
      setStudents(studentsRes);
      setResults(resultsRes);

      if (yearsRes[0]) setExamForm((prev) => ({ ...prev, academicYearId: yearsRes[0].id }));
      if (examsRes[0]) {
        setSelectedExamId(examsRes[0].id);
        setPaperForm((prev) => ({ ...prev, examinationId: examsRes[0].id }));
      }
      if (subjRes[0]) setPaperForm((prev) => ({ ...prev, subjectId: subjRes[0].id }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load examination records.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.examinations.create(examForm);
      setShowExamModal(false);
      setExamForm({
        title: '',
        academicYearId: academicYears[0]?.id || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.examinations.addSubject({
        ...paperForm,
        examinationId: selectedExamId || paperForm.examinationId,
        maxMarks: Number(paperForm.maxMarks),
        passingMarks: Number(paperForm.passingMarks)
      });
      setShowPaperModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add exam paper.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const examSubjects = currentExam?.subjects || [];

  // When paper changes in marks entry tab, init marks map
  useEffect(() => {
    if (examSubjects.length > 0 && !selectedPaperId) {
      setSelectedPaperId(examSubjects[0].id);
    }
    const initialMarks: Record<string, { marksObtained: number; remarks: string }> = {};
    students.forEach((st) => {
      initialMarks[st.id] = { marksObtained: 75, remarks: '' };
    });
    setMarksMap(initialMarks);
  }, [selectedPaperId, examSubjects, students]);

  const calculateGrade = (marks: number, max: number) => {
    const pct = (marks / max) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  const handleSaveMarks = async () => {
    if (!selectedPaperId) return;
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      const records = Object.entries(marksMap).map(([studentId, val]) => ({
        studentId,
        marksObtained: Number(val.marksObtained),
        remarks: val.remarks || undefined
      }));

      await api.examinations.saveMarks({
        examSubjectId: selectedPaperId,
        marks: records
      });

      setSaveSuccess(true);
      fetchData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save student marks.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Examinations & Marks Grading
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Schedule institutional examinations, configure question papers, input student marks, and publish results.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPaperModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Exam Paper</span>
          </button>
          <button
            onClick={() => setShowExamModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Examination</span>
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
          onClick={() => setActiveTab('exams')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Examinations List ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('marks_entry')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'marks_entry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Marks Entry Grid</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'results'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Published Results Summary ({results.length})</span>
        </button>
      </div>

      {/* Tab 1: Examination Schedules */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex) => (
              <div key={ex.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{ex.title}</h3>
                  <ExamStatusBadge status={ex.status} />
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    <span className="text-slate-400">Duration:</span>{' '}
                    <strong className="text-slate-800">
                      {new Date(ex.startDate).toLocaleDateString()} — {new Date(ex.endDate).toLocaleDateString()}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Papers Scheduled:</span>{' '}
                    <strong className="text-slate-800">{ex.subjects?.length || 0} papers</strong>
                  </p>
                </div>

                {/* Scheduled Papers for this exam */}
                {ex.subjects && ex.subjects.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Subject Papers
                    </span>
                    <div className="divide-y divide-slate-100">
                      {ex.subjects.map((sub) => (
                        <div key={sub.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{sub.subject.name}</span>
                            <span className="text-[11px] text-slate-400 block">
                              Date: {new Date(sub.examDate).toLocaleDateString()} • Room: {sub.roomNumber || 'TBA'}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            Max: {sub.maxMarks} / Pass: {sub.passingMarks}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Marks Entry Grid */}
      {activeTab === 'marks_entry' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Exam
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    const found = exams.find((x) => x.id === e.target.value);
                    if (found?.subjects && found.subjects[0]) {
                      setSelectedPaperId(found.subjects[0].id);
                    }
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium bg-white"
                >
                  {exams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Select Exam Paper
                </label>
                <select
                  value={selectedPaperId}
                  onChange={(e) => setSelectedPaperId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium bg-white"
                >
                  {examSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject.name} ({s.subject.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveMarks}
              disabled={isSubmitting || !selectedPaperId}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveSuccess ? 'Saved & Evaluated!' : 'Save & Calculate Grades'}</span>
            </button>
          </div>

          {/* Marks Input Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {!selectedPaperId ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">No exam paper selected.</p>
                <p className="text-xs text-slate-400">Please schedule an exam paper first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Marks Obtained (out of 100)</th>
                      <th className="py-3 px-4 text-center">Calculated Grade</th>
                      <th className="py-3 px-4 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st) => {
                      const marksVal = marksMap[st.id]?.marksObtained ?? 75;
                      const grade = calculateGrade(marksVal, 100);
                      const isPassed = marksVal >= 40;
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.studentId}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {st.firstName} {st.lastName}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marksVal}
                              onChange={(e) =>
                                setMarksMap((prev) => ({
                                  ...prev,
                                  [st.id]: {
                                    ...prev[st.id],
                                    marksObtained: Number(e.target.value)
                                  }
                                }))
                              }
                              className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl font-mono text-center font-bold"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPassed ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                PASSED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                FAILED
                              </span>
                            )}
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

      {/* Tab 3: Published Results */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {results.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No examination marks published yet.</p>
              <p className="text-xs text-slate-400">Save marks in the Marks Entry tab to publish results.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Exam Paper</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {res.examSubject?.subject.name || 'Subject Paper'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {res.student?.firstName} {res.student?.lastName}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">{res.student?.studentId}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {res.marksObtained} / {res.examSubject?.maxMarks || 100}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{res.grade || 'A'}</td>
                      <td className="py-3 px-4">
                        {res.isPassed ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            PASSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Schedule Examination</h3>
              <button onClick={() => setShowExamModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="e.g. Mid-Term Examination Fall 2026"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year *</label>
                <select
                  required
                  value={examForm.academicYearId}
                  onChange={(e) => setExamForm({ ...examForm, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowExamModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Scheduling...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Exam Paper Modal */}
      {showPaperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Exam Paper</h3>
              <button onClick={() => setShowPaperModal(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePaper} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Examination *</label>
                <select
                  required
                  value={paperForm.examinationId}
                  onChange={(e) => setPaperForm({ ...paperForm, examinationId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {exams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={paperForm.subjectId}
                  onChange={(e) => setPaperForm({ ...paperForm, subjectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={paperForm.maxMarks}
                    onChange={(e) => setPaperForm({ ...paperForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    value={paperForm.passingMarks}
                    onChange={(e) => setPaperForm({ ...paperForm, passingMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Room / Hall</label>
                <input
                  type="text"
                  value={paperForm.roomNumber}
                  onChange={(e) => setPaperForm({ ...paperForm, roomNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowPaperModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Add Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
