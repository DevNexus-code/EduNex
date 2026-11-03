import {
  User,
  UserMetrics,
  Department,
  Course,
  Subject,
  AcademicYear,
  ClassSection,
  Student,
  Staff,
  StudentAttendance,
  StaffAttendance,
  LeaveRequest,
  FeeCategory,
  FeeStructure,
  FeePayment,
  Examination,
  StudentMark,
  Timetable,
  Announcement,
  Document,
  AuditLog,
  DashboardMetrics,
  AcademicReportSummary,
  ParentRecord,
  ParentChildSummary,
  ChildAcademicSummary,
  StudentAdmissionCredentials,
  EmailNotificationLog
} from '../types';

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  return '/api/v1';
}

const API_BASE = resolveApiBase();
const TOKEN_KEY = 'edunex_token';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage might be restricted
  }
};

/**
 * Safely constructs a URL query string from an object.
 * Strips out undefined, null, empty strings, and the literal strings "undefined" or "null".
 */
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null) continue;
    const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
    if (!value || value === 'undefined' || value === 'null') continue;
    searchParams.append(key, value);
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export class ApiError extends Error {
  statusCode: number;
  title: string;
  detail: string;
  invalidParams?: Array<{ name: string; reason: string }>;

  constructor(
    statusCode: number,
    title: string,
    detail: string,
    invalidParams?: Array<{ name: string; reason: string }>
  ) {
    super(detail || title);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.title = title;
    this.detail = detail;
    this.invalidParams = invalidParams;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include' // transmits HttpOnly session cookies
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { title: response.statusText, detail: `HTTP error ${response.status}` };
    }
    throw new ApiError(
      response.status,
      errorData.title || 'Request Error',
      errorData.detail || errorData.message || 'An unexpected error occurred.',
      errorData.invalidParams
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const result = await response.json();
  return result.data !== undefined ? result.data : result;
}

export const api = {
  // Authentication
  auth: {
    login: async (credentials: { identifier?: string; email?: string; password?: string; requireOtp?: boolean }) => {
      const res = await request<{
        requiresOtp?: boolean;
        user?: User;
        token?: string;
        challengeId?: string;
        recipientMasked?: string;
        expiresInSeconds?: number;
        resendAvailableInSeconds?: number;
        userId?: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    verifyLoginOtp: async (payload: { challengeId: string; otp: string }) => {
      const res = await request<{ user: User; token: string }>('/auth/verify-login-otp', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    resendOtp: (payload: { challengeId?: string; email?: string; purpose?: string }) =>
      request<{
        challengeId: string;
        recipientMasked: string;
        expiresInSeconds: number;
        resendAvailableInSeconds: number;
      }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    verifyActivationToken: (token: string) =>
      request<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        loginId: string;
        expiresAt: string;
      }>(`/auth/activate/verify${buildQueryString({ token })}`),
    completeActivation: (payload: { token: string; newPassword: string }) =>
      request<{
        userId: string;
        email: string;
        loginId: string;
        role: string;
        message: string;
      }>('/auth/activate/complete', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    changePassword: (data: { currentPassword?: string; newPassword?: string }) =>
      request<{ message: string; user: User }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    logout: async () => {
      try {
        return await request<{ message: string }>('/auth/logout', {
          method: 'POST'
        });
      } finally {
        setAuthToken(null);
      }
    },
    me: () => request<{ user: User }>('/auth/me'),
    firebaseAuth: async (payload: { idToken: string }) => {
      const res = await request<{ user: User; token: string }>('/auth/firebase', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    googleAuth: async (payload: {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
    }) => {
      const res = await request<{ user: User; token: string }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.token) {
        setAuthToken(res.token);
      }
      return res;
    },
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    resetPasswordWithOtp: (payload: { email?: string; otp?: string; newPassword: string; token?: string }) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // Users & Self Profile
  users: {
    getSelfProfile: () => request<User>('/users/me/profile'),
    updateSelfProfile: (data: Partial<User>) =>
      request<User>('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    requestProfileUpdate: (data: Partial<User>) =>
      request<{
        requiresOtp: boolean;
        data?: User;
        challengeId?: string;
        recipientMasked?: string;
        expiresInSeconds?: number;
        resendAvailableInSeconds?: number;
      }>('/users/me/profile/request-update', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    verifyProfileUpdate: (payload: { challengeId: string; otp: string }) =>
      request<User>('/users/me/profile/verify-update', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    updateAvatar: (avatarUrl: string) =>
      request<User>('/users/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatarUrl })
      }),
    removeAvatar: () =>
      request<User>('/users/me/avatar', {
        method: 'DELETE'
      }),
    list: (params?: Record<string, any>) =>
      request<User[]>(`/users${buildQueryString(params)}`),
    getMetrics: () => request<UserMetrics>('/users/metrics'),
    create: (data: any) =>
      request<{
        user: User;
        loginId?: string;
        emailStatus?: 'SENT' | 'FAILED' | 'MANUAL_DELIVERY_REQUIRED';
        activationToken?: string;
        temporaryPassword?: string;
        credentialSlip?: { loginId: string; temporaryPassword: string; note: string };
      }>('/users', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    resetPassword: (id: string) =>
      request<{ message: string; resetLink?: string; temporaryPassword?: string }>(
        `/users/${id}/reset-password`,
        { method: 'POST' }
      ),
    resendActivation: (id: string) =>
      request<{ message: string; deliveryStatus: 'SENT' | 'FAILED'; activationToken?: string }>(
        `/users/${id}/resend-activation`,
        { method: 'POST' }
      )
  },

  // Academics
  academics: {
    getDepartments: () => request<Department[]>('/academics/departments'),
    createDepartment: (data: any) =>
      request<Department>('/academics/departments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateDepartment: (id: string, data: any) =>
      request<Department>(`/academics/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getCourses: (departmentId?: string) =>
      request<Course[]>(`/academics/courses${buildQueryString({ departmentId })}`),
    createCourse: (data: any) =>
      request<Course>('/academics/courses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateCourse: (id: string, data: any) =>
      request<Course>(`/academics/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getSubjects: (courseId?: string) =>
      request<Subject[]>(`/academics/subjects${buildQueryString({ courseId })}`),
    createSubject: (data: any) =>
      request<Subject>('/academics/subjects', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateSubject: (id: string, data: any) =>
      request<Subject>(`/academics/subjects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    getAcademicYears: () => request<AcademicYear[]>('/academics/academic-years'),
    createAcademicYear: (data: any) =>
      request<AcademicYear>('/academics/academic-years', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateAcademicYear: (id: string, data: any) =>
      request<AcademicYear>(`/academics/academic-years/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    setCurrentAcademicYear: (id: string) =>
      request<AcademicYear>(`/academics/academic-years/${id}/current`, {
        method: 'PATCH'
      }),

    getSections: (courseId?: string) =>
      request<ClassSection[]>(`/academics/sections${buildQueryString({ courseId })}`),
    createSection: (data: any) =>
      request<ClassSection>('/academics/sections', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateSection: (id: string, data: any) =>
      request<ClassSection>(`/academics/sections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  },

  // Students
  students: {
    list: (params?: Record<string, any>) =>
      request<Student[]>(`/students${buildQueryString(params)}`),
    getById: (id: string) => request<Student>(`/students/${id}`),
    create: (data: any) =>
      request<{ student: Student; credentials?: StudentAdmissionCredentials }>('/students', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<Student>(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    archive: (id: string) =>
      request<Student>(`/students/${id}`, {
        method: 'DELETE'
      }),
    resetPassword: (id: string) =>
      request<{ message: string; studentId: string; temporaryPassword: string }>(
        `/students/${id}/reset-password`,
        { method: 'POST' }
      ),
    resetParentPassword: (id: string) =>
      request<{ message: string; parentId: string; parentName: string; temporaryPassword: string }>(
        `/students/${id}/parent/reset-password`,
        { method: 'POST' }
      ),
    resendAdmissionEmail: (id: string) =>
      request<{ message: string; deliveryStatus: 'SENT' | 'FAILED'; activationToken?: string }>(
        `/students/${id}/resend-admission-email`,
        { method: 'POST' }
      )
  },

  // Parents Management & Portal
  parents: {
    list: (params?: Record<string, any>) =>
      request<ParentRecord[]>(`/parents${buildQueryString(params)}`),
    getById: (id: string) => request<ParentRecord>(`/parents/${id}`),
    create: (data: any) =>
      request<{ parent: ParentRecord; temporaryPassword?: string }>('/parents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<ParentRecord>(`/parents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    resetPassword: (id: string) =>
      request<{ message: string; parentId: string; temporaryPassword: string }>(
        `/parents/${id}/reset-password`,
        { method: 'POST' }
      ),
    linkStudent: (id: string, studentIdentifier: string) =>
      request<{ message: string; parent: any; student: any }>(`/parents/${id}/link-student`, {
        method: 'POST',
        body: JSON.stringify({ studentIdentifier })
      }),
    unlinkStudent: (id: string, studentId: string) =>
      request<{ message: string; studentId: string }>(`/parents/${id}/unlink-student`, {
        method: 'POST',
        body: JSON.stringify({ studentId })
      }),
    getMyChildren: () => request<ParentChildSummary>('/parents/portal/my-children'),
    getChildSummary: (studentId: string) =>
      request<ChildAcademicSummary>(`/parents/portal/child/${studentId}/summary`)
  },

  // Staff
  staff: {
    list: (params?: Record<string, any>) =>
      request<Staff[]>(`/staff${buildQueryString(params)}`),
    getById: (id: string) => request<Staff>(`/staff/${id}`),
    create: (data: any) =>
      request<Staff>('/staff', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<Staff>(`/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    assignSubjects: (id: string, subjectIds: string[]) =>
      request<Staff>(`/staff/${id}/subjects`, {
        method: 'PUT',
        body: JSON.stringify({ subjectIds })
      }),
    archive: (id: string) =>
      request<Staff>(`/staff/${id}`, {
        method: 'DELETE'
      })
  },

  // Attendance
  attendance: {
    markStudent: (data: any) =>
      request<StudentAttendance>('/attendance/students', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    markStudentBatch: (data: { date: string; sectionId?: string; attendance: Array<{ studentId: string; status: string; remarks?: string }> }) =>
      request<{ count: number; message: string }>('/attendance/students/batch', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    listStudentAttendance: (params?: Record<string, any>) =>
      request<StudentAttendance[]>(`/attendance/students${buildQueryString(params)}`),
    getStudentMonthlyReport: (studentId: string, month: number, year: number) =>
      request<any>(`/attendance/students/monthly${buildQueryString({ studentId, month, year })}`),

    markStaff: (data: any) =>
      request<StaffAttendance>('/attendance/staff', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    listStaffAttendance: (params?: Record<string, any>) =>
      request<StaffAttendance[]>(`/attendance/staff${buildQueryString(params)}`),
    getExportUrl: (params?: Record<string, any>) =>
      `${API_BASE}/attendance/export${buildQueryString(params)}`
  },

  // Leaves
  leaves: {
    list: (params?: Record<string, any>) =>
      request<LeaveRequest[]>(`/leaves${buildQueryString(params)}`),
    apply: (data: any) =>
      request<LeaveRequest>('/leaves', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    review: (id: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }) =>
      request<LeaveRequest>(`/leaves/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  },

  // Fees
  fees: {
    getCategories: () => request<FeeCategory[]>('/fees/categories'),
    createCategory: (data: any) =>
      request<FeeCategory>('/fees/categories', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getStructures: (courseId?: string) =>
      request<FeeStructure[]>(`/fees/structures${buildQueryString({ courseId })}`),
    createStructure: (data: any) =>
      request<FeeStructure>('/fees/structures', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateStructure: (id: string, data: any) =>
      request<FeeStructure>(`/fees/structures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    deleteStructure: (id: string) =>
      request<{ message: string }>(`/fees/structures/${id}`, {
        method: 'DELETE'
      }),

    recordPayment: (data: any) =>
      request<FeePayment>('/fees/payments', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getPayments: (params?: Record<string, any>) =>
      request<FeePayment[]>(`/fees/payments${buildQueryString(params)}`),
    getReceipt: (receiptNumber: string) =>
      request<FeePayment>(`/fees/receipt/${receiptNumber}`),
    getStudentBalances: () =>
      request<Array<{ studentId: string; studentName: string; courseName: string; totalFees: number; totalPaid: number; balance: number }>>('/fees/balances')
  },

  // Examinations
  examinations: {
    list: (params?: Record<string, any>) =>
      request<Examination[]>(`/examinations${buildQueryString(params)}`),
    getById: (id: string) => request<Examination>(`/examinations/${id}`),
    create: (data: any) =>
      request<Examination>('/examinations', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    addSubject: (data: any) =>
      request<any>('/examinations/subjects', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    saveMarks: (data: { examSubjectId: string; marks: Array<{ studentId: string; marksObtained: number; remarks?: string }> }) =>
      request<{ count: number }>('/examinations/marks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getResults: (params?: Record<string, any>) =>
      request<StudentMark[]>(`/examinations/results${buildQueryString(params)}`)
  },

  // Timetable
  timetable: {
    list: (params?: Record<string, any>) =>
      request<Timetable[]>(`/timetable${buildQueryString(params)}`),
    create: (data: any) =>
      request<Timetable>('/timetable', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<Timetable>(`/timetable/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/timetable/${id}`, {
        method: 'DELETE'
      })
  },

  // Announcements
  announcements: {
    list: (params?: Record<string, any>) =>
      request<Announcement[]>(`/announcements${buildQueryString(params)}`),
    create: (data: any) =>
      request<Announcement>('/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: any) =>
      request<Announcement>(`/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/announcements/${id}`, {
        method: 'DELETE'
      })
  },

  // Documents
  documents: {
    list: (params?: Record<string, any>) =>
      request<Document[]>(`/documents${buildQueryString(params)}`),
    uploadMeta: (data: any) =>
      request<Document>('/documents', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/documents/${id}`, {
        method: 'DELETE'
      })
  },

  // Reports
  reports: {
    getSummary: () => request<AcademicReportSummary>('/reports/summary'),
    getExportUrl: (type: 'students' | 'staff' | 'attendance' | 'fees' | 'exams', params?: Record<string, any>) => {
      return `${API_BASE}/reports/export/${type}${buildQueryString(params)}`;
    }
  },

  // Audit Logs
  auditLogs: {
    list: (params?: Record<string, any>) =>
      request<{ data: AuditLog[]; meta: any }>(`/audit-logs${buildQueryString(params)}`)
  },

  // Dashboard
  dashboard: {
    getMetrics: () => request<DashboardMetrics>('/dashboard/metrics')
  },

  // Email Notification History & Audit
  notifications: {
    list: (params?: { type?: string; status?: string; search?: string }) =>
      request<EmailNotificationLog[]>(`/notifications${buildQueryString(params)}`),
    getMetrics: () =>
      request<{
        total: number;
        sent: number;
        failed: number;
        pending: number;
        provider: { isConfigured: boolean; from: string };
      }>('/notifications/metrics'),
    retry: (id: string) =>
      request<{ message: string; success: boolean }>(`/notifications/${id}/retry`, {
        method: 'POST'
      })
  }
};
