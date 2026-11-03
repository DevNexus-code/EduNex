import React from 'react';
import {
  Role,
  StudentStatus,
  AttendanceStatus,
  LeaveStatus,
  ExamStatus,
  AnnouncementPriority
} from '../../types';

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const styles: Record<Role, { bg: string; label: string }> = {
    SUPER_ADMIN: { bg: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Super Admin' },
    ADMIN: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: 'Administrator' },
    PRINCIPAL: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Principal' },
    TEACHER: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Teacher' },
    STAFF: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Staff' },
    STUDENT: { bg: 'bg-sky-100 text-sky-800 border-sky-300', label: 'Student' },
    PARENT: { bg: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Parent' }
  };

  const config = styles[role] || { bg: 'bg-slate-100 text-slate-800 border-slate-300', label: role };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${config.bg}`}
    >
      {config.label}
    </span>
  );
};

export const StudentStatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  const styles: Record<StudentStatus, { bg: string; label: string }> = {
    ACTIVE: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Active' },
    ENROLLED: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Enrolled' },
    GRADUATED: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Graduated' },
    SUSPENDED: { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Suspended' },
    ARCHIVED: { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Archived' }
  };

  const config = styles[status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: status };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {config.label}
    </span>
  );
};

export const AttendanceBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  const styles: Record<AttendanceStatus, { bg: string; label: string }> = {
    PRESENT: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Present' },
    ABSENT: { bg: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Absent' },
    LATE: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Late' },
    EXCUSED: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Excused' },
    HALF_DAY: { bg: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Half Day' }
  };

  const config = styles[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export const LeaveStatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => {
  const styles: Record<LeaveStatus, { bg: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Pending Review' },
    APPROVED: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Approved' },
    REJECTED: { bg: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Rejected' },
    CANCELLED: { bg: 'bg-slate-100 text-slate-700 border-slate-300', label: 'Cancelled' }
  };

  const config = styles[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export const ExamStatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => {
  const styles: Record<ExamStatus, { bg: string; label: string }> = {
    SCHEDULED: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Scheduled' },
    ONGOING: { bg: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse', label: 'In Progress' },
    COMPLETED: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Completed' },
    CANCELLED: { bg: 'bg-slate-100 text-slate-700 border-slate-300', label: 'Cancelled' }
  };

  const config = styles[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: AnnouncementPriority }> = ({ priority }) => {
  const styles: Record<AnnouncementPriority, { bg: string; label: string }> = {
    LOW: { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Low' },
    MEDIUM: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Medium' },
    HIGH: { bg: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High' },
    URGENT: { bg: 'bg-rose-100 text-rose-800 border-rose-300 font-black', label: 'Urgent' }
  };

  const config = styles[priority] || styles.LOW;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
};
