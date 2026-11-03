// ==============================================================================
// EDUNEX — Complete Student & Staff Management System Types
// ==============================================================================

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'STAFF'
  | 'STUDENT'
  | 'PARENT';

export type DepartmentStatus = 'ACTIVE' | 'INACTIVE';

export type CourseType =
  | 'UNDERGRADUATE'
  | 'POSTGRADUATE'
  | 'DIPLOMA'
  | 'CERTIFICATION'
  | 'DOCTORATE';

export type StudentStatus =
  | 'ENROLLED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'GRADUATED'
  | 'ARCHIVED';

export type StaffCategory =
  | 'TEACHING'
  | 'NON_TEACHING'
  | 'ADMINISTRATIVE'
  | 'SUPPORT';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'VISITING';

export type StaffStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'RESIGNED'
  | 'RETIRED'
  | 'ARCHIVED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY';

export type LeaveType =
  | 'CASUAL'
  | 'SICK'
  | 'EARNED'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'BEREAVEMENT'
  | 'UNPAID';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type FeePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'CHEQUE'
  | 'ONLINE';

export type FeePaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type ExamStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type AnnouncementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TargetAudience =
  | 'ALL'
  | 'STUDENTS'
  | 'TEACHERS'
  | 'STAFF'
  | 'PARENTS'
  | 'DEPARTMENT';

export type DocumentType =
  | 'ADMISSION_FORM'
  | 'TRANSFER_CERTIFICATE'
  | 'GRADE_REPORT'
  | 'ID_PROOF'
  | 'MEDICAL_RECORD'
  | 'STAFF_RESUME'
  | 'CONTRACT'
  | 'OTHER';

// ==============================================================================
// CORE ENTITIES
// ==============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  firebaseUid?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  staffId?: string | null;
  studentId?: string | null;
  parentId?: string | null;
  mustChangePassword?: boolean;
  designation?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  address?: string | null;
  bio?: string | null;
  departmentId?: string | null;
  department?: Department | null;
  staffProfile?: Staff | null;
  studentProfile?: Student | null;
  loginId?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  headOfDepartment?: string | null;
  email?: string | null;
  phone?: string | null;
  status: DepartmentStatus;
  courses?: Course[];
  students?: Student[];
  staff?: Staff[];
  _count?: {
    courses: number;
    students: number;
    staff: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  type: CourseType;
  departmentId: string;
  department?: Department;
  durationYears: number;
  totalSemesters: number;
  description?: string | null;
  status?: DepartmentStatus;
  subjects?: Subject[];
  sections?: ClassSection[];
  _count?: {
    subjects: number;
    students: number;
    sections: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  department?: Department;
  courseId: string;
  course?: Course;
  semester: number;
  credits: number;
  isElective: boolean;
  status?: DepartmentStatus;
  teacherId?: string | null;
  teacher?: Staff | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSection {
  id: string;
  name: string;
  courseId: string;
  course?: Course;
  academicYearId: string;
  academicYear?: AcademicYear;
  semester: number;
  capacity: number;
  status?: DepartmentStatus;
  classTeacherId?: string | null;
  classTeacher?: Staff | null;
  _count?: {
    students: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  admissionNumber: string;
  userId?: string | null;
  user?: User | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  status: StudentStatus;
  admissionDate: string;
  departmentId: string;
  department?: Department;
  courseId: string;
  course?: Course;
  sectionId?: string | null;
  section?: ClassSection | null;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  attendancePercentage?: number;
  feeBalance?: number;
  parentId?: string | null;
  parent?: ParentRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentRecord {
  id: string;
  parentId: string;
  userId?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  emergencyPhone?: string | null;
  relation: string;
  occupation?: string | null;
  address?: string | null;
  loginId?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  isActive: boolean;
  students?: Array<{
    id: string;
    studentId: string;
    admissionNumber: string;
    name: string;
    firstName: string;
    lastName: string;
    course: string;
    department: string;
    section: string;
    status: StudentStatus;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentAdmissionCredentials {
  studentId: string;
  studentAdmissionNumber: string;
  studentEmail: string;
  studentTemporaryPassword: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string | null;
  parentTemporaryPassword?: string | null;
  parentAccountStatus: 'CREATED' | 'LINKED_EXISTING';
}

export interface ParentChildSummary {
  parent: {
    id: string;
    parentId: string;
    name: string;
    relation?: string;
    occupation?: string;
    email?: string | null;
    phone: string;
    alternatePhone?: string | null;
    emergencyPhone?: string | null;
    address?: string | null;
  };
  children: Array<{
    id: string;
    studentId: string;
    admissionNumber: string;
    admissionDate: string;
    firstName: string;
    lastName: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    course: string;
    courseCode?: string;
    department: string;
    section: string;
    semester?: number;
    academicYear?: string;
    status: StudentStatus;
    dateOfBirth?: string;
  }>;
}

export interface ChildAcademicSummary {
  student: {
    id: string;
    studentId: string;
    admissionNumber: string;
    admissionDate: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    course?: string;
    courseCode?: string;
    department?: string;
    section?: string;
    semester?: number;
    academicYear?: string;
    status: StudentStatus;
    parentName?: string;
    parentPhone?: string;
    parentRelation?: string;
  };
  metrics: {
    attendanceRate: number;
    totalAttendanceSessions: number;
    presentCount: number;
    absentCount: number;
    totalFeeAmount: number;
    totalFeePaid: number;
    balanceDue: number;
  };
  attendance: StudentAttendance[];
  marks: StudentMark[];
  feePayments: FeePayment[];
  feeStructures: FeeStructure[];
  timetable: Timetable[];
  announcements: Announcement[];
  documents: Document[];
}

export interface Staff {
  id: string;
  staffId: string;
  userId?: string | null;
  user?: User | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  category: StaffCategory;
  departmentId?: string | null;
  department?: Department | null;
  designation: string;
  qualification?: string | null;
  employmentType: EmploymentType;
  joiningDate: string;
  status: StaffStatus;
  address?: string | null;
  city?: string | null;
  assignedSubjects?: Subject[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentAttendance {
  id: string;
  studentId: string;
  student?: Student;
  sectionId?: string | null;
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  staff?: Staff;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staff?: Staff;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedBy?: User | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  createdAt: string;
}

export interface FeeStructure {
  id: string;
  categoryId: string;
  category: FeeCategory;
  courseId: string;
  course: Course;
  academicYearId?: string;
  academicYear?: AcademicYear | string;
  amount: number;
  frequency?: string;
  dueDate?: string | null;
  semester?: number | null;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  studentId: string;
  student?: Student;
  feeStructureId?: string | null;
  feeStructure?: FeeStructure | null;
  totalAmount?: number;
  amountPaid: number;
  discountAmount?: number;
  balanceDue?: number;
  paymentMethod: FeePaymentMethod;
  status: FeePaymentStatus;
  transactionRef?: string | null;
  paymentDate: string;
  remarks?: string | null;
  recordedById?: string | null;
  createdAt: string;
}

export interface Examination {
  id: string;
  title: string;
  academicYearId: string;
  academicYear?: AcademicYear;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  subjects?: ExaminationSubject[];
  createdAt: string;
}

export interface ExaminationSubject {
  id: string;
  examinationId: string;
  examination?: Examination;
  subjectId: string;
  subject: Subject;
  examDate: string;
  maxMarks: number;
  passingMarks: number;
  roomNumber?: string | null;
  marks?: StudentMark[];
  createdAt: string;
}

export interface StudentMark {
  id: string;
  examSubjectId: string;
  examSubject?: ExaminationSubject;
  studentId: string;
  student?: Student;
  marksObtained: number;
  grade?: string | null;
  isPassed: boolean;
  remarks?: string | null;
  createdAt: string;
}

export interface Timetable {
  id: string;
  courseId?: string;
  course?: Course;
  sectionId?: string | null;
  section?: ClassSection | null;
  subjectId: string;
  subject?: Subject;
  teacherId: string;
  teacher?: {
    id: string;
    staffId?: string;
    firstName: string;
    lastName: string;
  } | Staff | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  roomNumber: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: TargetAudience;
  departmentId?: string | null;
  department?: Department | null;
  authorId?: string | null;
  author?: User | null;
  publishDate: string;
  expiryDate?: string | null;
  loginId?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  documentType: DocumentType;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  studentId?: string | null;
  student?: Student | null;
  staffId?: string | null;
  staff?: Staff | null;
  uploadedById?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId?: string | null;
  actorName?: string;
  actorEmail?: string;
  targetId?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  totalTeachers: number;
  totalDepartments: number;
  totalCourses: number;
  todayAttendanceRate: number;
  totalFeeCollected: number;
  pendingFeeEstimates: number;
  recentAdmissions: Student[];
  upcomingExams: Examination[];
  activeAnnouncements: Announcement[];
}

export interface AcademicReportSummary {
  overview: {
    totalStudents: number;
    activeStudents: number;
    totalStaff: number;
    totalCourses: number;
    totalDepartments: number;
    totalExams: number;
    totalFeeCollected: number;
    overallAttendanceRate: number;
  };
  enrollmentByDepartment: Array<{
    department: string;
    count: number;
  }>;
  feeStructures: Array<{
    courseName: string;
    categoryName: string;
    amount: number;
    frequency: string;
  }>;
}

export interface UserMetrics {
  total: number;
  active: number;
  inactive: number;
  superAdmins: number;
  admins: number;
  principals: number;
  teachers: number;
  staffMembers: number;
  students: number;
  parents: number;
}

export interface EmailNotificationLog {
  id: string;
  recipient: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  notificationType: string;
  subject: string;
  contentSummary?: string | null;
  status: 'SENT' | 'FAILED' | 'PENDING';
  errorMessage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

