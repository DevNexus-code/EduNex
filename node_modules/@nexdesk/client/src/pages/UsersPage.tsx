import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  Edit2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Mail,
  Lock,
  Inbox,
  RotateCw,
  Printer,
  Send,
  CheckCircle2
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { User, Role, EmailNotificationLog } from '../types';
import { RoleBadge } from '../components/common/Badges';

export const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'notifications'>('directory');

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmStatusUser, setConfirmStatusUser] = useState<User | null>(null);

  // Creation Form State
  const [createEmail, setCreateEmail] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createRole, setCreateRole] = useState<Role>('TEACHER');
  const [createDepartmentId, setCreateDepartmentId] = useState<string>('');
  const [createPasswordOption, setCreatePasswordOption] = useState<'invite' | 'temp'>('invite');
  const [createTempPassword, setCreateTempPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);
  const [createdSuccessResult, setCreatedSuccessResult] = useState<{
    user: User;
    loginId?: string;
    emailStatus?: 'SENT' | 'FAILED' | 'MANUAL_DELIVERY_REQUIRED';
    activationToken?: string;
    tempPassword?: string;
    resetLink?: string;
    credentialSlip?: { loginId: string; temporaryPassword: string; note: string };
  } | null>(null);

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState<Role>('TEACHER');
  const [editDepartmentId, setEditDepartmentId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Action status / banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [resendingActivationId, setResendingActivationId] = useState<string | null>(null);

  // Notification Logs State
  const [notificationLogs, setNotificationLogs] = useState<EmailNotificationLog[]>([]);
  const [notificationMetrics, setNotificationMetrics] = useState<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    provider: { isConfigured: boolean; from: string };
  } | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifTypeFilter, setNotifTypeFilter] = useState('ALL');
  const [notifStatusFilter, setNotifStatusFilter] = useState('ALL');
  const [notifSearch, setNotifSearch] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.users.list({
        search: searchQuery || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter.toLowerCase() as any) : undefined
      });
      setUsers(data || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to retrieve user directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.academics.getDepartments();
      setDepartments(data || []);
    } catch {
      // Graceful fallback
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      setNotifLoading(true);
      const [logs, metrics] = await Promise.all([
        api.notifications.list({
          type: notifTypeFilter !== 'ALL' ? notifTypeFilter : undefined,
          status: notifStatusFilter !== 'ALL' ? notifStatusFilter : undefined,
          search: notifSearch || undefined
        }),
        api.notifications.getMetrics()
      ]);
      setNotificationLogs(logs || []);
      setNotificationMetrics(metrics);
    } catch {
      // Graceful fallback
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotificationLogs();
    }
  }, [activeTab, notifTypeFilter, notifStatusFilter, notifSearch]);

  // KPI Calculations
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const verifiedUsers = users.filter((u) => u.isEmailVerified).length;
  const pendingUsers = users.filter((u) => !u.isEmailVerified).length;

  const handleOpenCreateModal = () => {
    setCreateEmail('');
    setCreateFirstName('');
    setCreateLastName('');
    setCreateRole('TEACHER');
    setCreateDepartmentId('');
    setCreatePasswordOption('invite');
    setCreateTempPassword('');
    setCreateModalError(null);
    setCreatedSuccessResult(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateModalError(null);

    try {
      const result = await api.users.create({
        email: createEmail.trim(),
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        role: createRole,
        password: createPasswordOption === 'temp' ? createTempPassword : undefined,
        sendInvite: createPasswordOption === 'invite',
        departmentId: createDepartmentId || null
      });

      setCreatedSuccessResult({
        user: result.user,
        loginId: result.loginId,
        emailStatus: result.emailStatus,
        activationToken: result.activationToken,
        tempPassword: result.temporaryPassword || (createPasswordOption === 'temp' ? createTempPassword : undefined),
        resetLink: result.activationToken ? `${window.location.origin}/auth/activate?token=${result.activationToken}` : undefined,
        credentialSlip: result.credentialSlip
      });

      fetchUsers();
    } catch (err: any) {
      setCreateModalError(err instanceof ApiError ? err.detail : err.message || 'Failed to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditRole(user.role);
    setEditDepartmentId(user.departmentId || '');
    setEditModalError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    setEditModalError(null);

    try {
      await api.users.update(editingUser.id, {
        firstName: editFirstName,
        lastName: editLastName,
        role: editRole,
        departmentId: editDepartmentId || null
      });

      setShowEditModal(false);
      setActionSuccessMessage(`User ${editFirstName} ${editLastName} updated successfully.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchUsers();
    } catch (err: any) {
      setEditModalError(err instanceof ApiError ? err.detail : err.message || 'Failed to update user.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmStatusUser) return;

    setIsTogglingStatus(true);
    try {
      const newStatus = !confirmStatusUser.isActive;
      await api.users.update(confirmStatusUser.id, {
        isActive: newStatus
      });

      setConfirmStatusUser(null);
      setActionSuccessMessage(
        `User ${confirmStatusUser.firstName} ${confirmStatusUser.lastName} has been ${
          newStatus ? 'activated' : 'deactivated'
        }.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchUsers();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to update user status.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleResendActivation = async (u: User) => {
    setResendingActivationId(u.id);
    try {
      const res = await api.users.resendActivation(u.id);
      setActionSuccessMessage(res.message);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to resend activation email.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setResendingActivationId(null);
    }
  };

  const handleTriggerResetPassword = async (user: User) => {
    try {
      const result = await api.users.resetPassword(user.id);
      setActionSuccessMessage(
        result.resetLink
          ? `Password reset link generated for ${user.email}. Link: ${result.resetLink}`
          : result.message
      );
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to trigger password reset.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleRetryNotification = async (id: string) => {
    setRetryingLogId(id);
    try {
      const res = await api.notifications.retry(id);
      setActionSuccessMessage(res.message);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      await fetchNotificationLogs();
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : 'Failed to retry email delivery.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setRetryingLogId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise User Directory</h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage corporate identities, assign role-based access permissions, and audit automated email delivery.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Tab Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'directory'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 text-indigo-700">
                {totalUsers}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'notifications'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Delivery Center</span>
              {notificationMetrics && notificationMetrics.failed > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                  {notificationMetrics.failed} failed
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision New User</span>
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'directory' ? (
        <>
          {/* KPI STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
              <div className="text-2xl font-black text-slate-900">{totalUsers}</div>
              <p className="text-[11px] text-slate-400">Database profiles</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Accounts</span>
              <div className="text-2xl font-black text-emerald-600">{activeUsers}</div>
              <p className="text-[11px] text-slate-400">Authenticated status</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Email Verified</span>
              <div className="text-2xl font-black text-indigo-600">{verifiedUsers}</div>
              <p className="text-[11px] text-slate-400">Confirmed addresses</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Activation</span>
              <div className="text-2xl font-black text-amber-600">{pendingUsers}</div>
              <p className="text-[11px] text-slate-400">Awaiting password setup</p>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or institutional Login ID..."
                className="block w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>Role:</span>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 font-medium bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="TEACHER">Teacher</option>
                <option value="STAFF">Staff</option>
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
              </select>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold pl-2">
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 font-medium bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Deactivated</option>
              </select>

              <button
                onClick={() => fetchUsers()}
                className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh Directory"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* User Directory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading && users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs font-semibold">Loading enterprise user directory...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-700">No users match your filter criteria</p>
                <p className="text-xs text-slate-400">Try adjusting your search query or role/status filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">User & Login ID</th>
                      <th className="py-3 px-4">Assigned Role</th>
                      <th className="py-3 px-4">Email Verification</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Firebase UID</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const displayLoginId = u.loginId || u.studentId || u.staffId || u.parentId || '—';
                      const hasExternalEmail = u.email && !u.email.endsWith('@internal.edunex.local');

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.firstName}
                                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                  {u.firstName[0]}
                                  {u.lastName ? u.lastName[0] : ''}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">
                                  {u.firstName} {u.lastName}
                                </div>
                                <div className="text-[11px] text-slate-500 leading-tight">{u.email}</div>
                                <div className="mt-1">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    ID: {displayLoginId}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <RoleBadge role={u.role} />
                          </td>

                          <td className="py-3 px-4">
                            {u.isEmailVerified ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                                Pending Activation
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {u.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                                Deactivated
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {u.firebaseUid ? (
                              <span title={u.firebaseUid} className="truncate max-w-[110px] block">
                                {u.firebaseUid.slice(0, 12)}...
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unlinked</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              {/* Resend Activation Email */}
                              {hasExternalEmail && !u.isEmailVerified && (
                                <button
                                  onClick={() => handleResendActivation(u)}
                                  disabled={resendingActivationId === u.id}
                                  className="p-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 text-indigo-600 transition"
                                  title="Resend Account Activation Email"
                                >
                                  {resendingActivationId === u.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                title="Edit User Profile & Role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleTriggerResetPassword(u)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-indigo-600 transition"
                                title="Generate Password Reset Link"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setConfirmStatusUser(u)}
                                className={`p-1.5 rounded-lg border transition ${
                                  u.isActive
                                    ? 'border-slate-200 hover:bg-rose-50 text-rose-600'
                                    : 'border-slate-200 hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                              >
                                {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* EMAIL NOTIFICATION CENTER TAB */
        <div className="space-y-6 animate-fadeIn">
          {/* Notification Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Dispatches</span>
              <div className="text-2xl font-black text-slate-900">{notificationMetrics?.total || 0}</div>
              <p className="text-[11px] text-slate-400">All recorded notifications</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Delivered</span>
              <div className="text-2xl font-black text-emerald-600">{notificationMetrics?.sent || 0}</div>
              <p className="text-[11px] text-slate-400">Successfully sent via SMTP</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Failed / Undelivered</span>
              <div className="text-2xl font-black text-rose-600">{notificationMetrics?.failed || 0}</div>
              <p className="text-[11px] text-slate-400">Errors logged for review</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Mail Transport</span>
              <div className="text-xs font-bold text-indigo-700 pt-1">
                {notificationMetrics?.provider.isConfigured ? 'Live SMTP Transport' : 'Dev In-Memory Mailbox'}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                From: {notificationMetrics?.provider.from || 'edunex@noreply.edu'}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                placeholder="Search by recipient email or subject..."
                className="block w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>Type:</span>
              </div>
              <select
                value={notifTypeFilter}
                onChange={(e) => setNotifTypeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 font-medium bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                <option value="ACCOUNT_ACTIVATION">Account Activation</option>
                <option value="STUDENT_ADMISSION">Student Admission</option>
                <option value="PARENT_ADMISSION_NOTICE">Parent Notice</option>
                <option value="LOGIN_OTP">Login OTP</option>
                <option value="PASSWORD_RESET">Password Reset</option>
                <option value="PROFILE_UPDATE_OTP">Profile Update OTP</option>
              </select>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold pl-2">
                <span>Status:</span>
              </div>
              <select
                value={notifStatusFilter}
                onChange={(e) => setNotifStatusFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-xl px-2.5 py-2 font-medium bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>

              <button
                onClick={() => fetchNotificationLogs()}
                className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh Notification Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${notifLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Notification Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {notifLoading && notificationLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs font-semibold">Loading email delivery audit logs...</p>
              </div>
            ) : notificationLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-700">No email notification logs found</p>
                <p className="text-xs text-slate-400">Events are logged automatically whenever the platform dispatches emails.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Attempts</th>
                      <th className="py-3 px-4">Dispatched At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notificationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{log.recipient}</div>
                          {log.userName && (
                            <div className="text-[11px] text-slate-500">
                              {log.userName} {log.userRole ? `(${log.userRole})` : ''}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {log.notificationType}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-[240px]">
                          <div className="truncate font-semibold text-slate-800" title={log.subject}>
                            {log.subject}
                          </div>
                          {log.errorMessage && (
                            <div className="text-[10px] text-rose-600 truncate mt-0.5" title={log.errorMessage}>
                              Error: {log.errorMessage}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {log.status === 'SENT' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Delivered
                            </span>
                          ) : log.status === 'FAILED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Loader2 className="w-3 h-3 mr-1 text-amber-600 animate-spin" />
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {log.retryCount} {log.retryCount === 1 ? 'try' : 'tries'}
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRetryNotification(log.id)}
                            disabled={retryingLogId === log.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold transition disabled:opacity-50"
                            title="Retry Email Dispatch"
                          >
                            {retryingLogId === log.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCw className="w-3 h-3" />
                            )}
                            <span>Retry</span>
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

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision New Campus Account</h3>
                  <p className="text-[11px] text-slate-500">Automated credential setup and email onboarding workflow.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdSuccessResult ? (
              <div className="pt-5 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span>Account Provisioned Successfully</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Account for <strong className="font-bold text-emerald-900">{createdSuccessResult.user.firstName} {createdSuccessResult.user.lastName}</strong> has been created with role <RoleBadge role={createdSuccessResult.user.role} />.
                  </p>
                </div>

                {/* Assigned Login ID */}
                {createdSuccessResult.loginId && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Institutional Login ID:</span>
                      <span className="font-mono font-black text-indigo-700 text-sm">{createdSuccessResult.loginId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdSuccessResult.loginId!)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600"
                      title="Copy Login ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Email Delivery Status Banner */}
                {createdSuccessResult.emailStatus === 'SENT' ? (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>An account activation email has been automatically dispatched to <strong>{createdSuccessResult.user.email}</strong>.</span>
                  </div>
                ) : createdSuccessResult.emailStatus === 'FAILED' ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Automated email delivery encountered an issue. You can resend the activation link from the User Directory or review Notification Logs.</span>
                  </div>
                ) : null}

                {/* Credential Slip for Internal Accounts */}
                {createdSuccessResult.credentialSlip && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5">
                    <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                      <Printer className="w-4 h-4" />
                      <span>Physical Credential Slip Required</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      This user has no external email address. Provide these credentials directly to the account holder:
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Login ID:</span>
                        <span className="font-bold text-slate-900">{createdSuccessResult.credentialSlip.loginId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Initial Password:</span>
                        <span className="font-bold text-slate-900">{createdSuccessResult.credentialSlip.temporaryPassword}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activation Setup Link */}
                {createdSuccessResult.resetLink && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase">Single-Use Activation Link:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdSuccessResult.resetLink!)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-slate-600 break-all bg-white p-2 rounded-lg border border-indigo-100">
                      {createdSuccessResult.resetLink}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="pt-4 space-y-3.5">
                {createModalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span>{createModalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createFirstName}
                      onChange={(e) => setCreateFirstName(e.target.value)}
                      placeholder="Jane"
                      className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createLastName}
                      onChange={(e) => setCreateLastName(e.target.value)}
                      placeholder="Doe"
                      className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registered Email Address (Optional for Internal)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="jane.doe@university.edu (leave empty if none)"
                      className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    If omitted, the platform provisions a manual credential slip with Login ID and initial credentials.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as Role)}
                      className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Institutional Super Admin)</option>
                      <option value="ADMIN">ADMIN (Academic Administrator)</option>
                      <option value="PRINCIPAL">PRINCIPAL (Principal / Academic Dean)</option>
                      <option value="TEACHER">TEACHER (Faculty & Grading)</option>
                      <option value="STAFF">STAFF (Campus Administrative Staff)</option>
                      <option value="STUDENT">STUDENT (Student Portal)</option>
                      <option value="PARENT">PARENT (Parent Portal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department (Optional)
                    </label>
                    <select
                      value={createDepartmentId}
                      onChange={(e) => setCreateDepartmentId(e.target.value)}
                      className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">No Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password Setting Option */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Onboarding & Credential Protocol
                  </span>
                  <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700">
                    <label className="inline-flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pwdOption"
                        checked={createPasswordOption === 'invite'}
                        onChange={() => setCreatePasswordOption('invite')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Automated Activation Link</span>
                    </label>
                    <label className="inline-flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pwdOption"
                        checked={createPasswordOption === 'temp'}
                        onChange={() => setCreatePasswordOption('temp')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Specify Initial Password</span>
                    </label>
                  </div>

                  {createPasswordOption === 'temp' && (
                    <div className="pt-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          minLength={8}
                          value={createTempPassword}
                          onChange={(e) => setCreateTempPassword(e.target.value)}
                          placeholder="Temporary password (min 8 characters)"
                          className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-60 transition flex items-center space-x-1.5"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit User Profile & Role</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="pt-4 space-y-3.5">
              {editModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{editModalError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Email:</span>
                <div className="font-bold text-slate-800">{editingUser.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Internal Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="STAFF">STAFF</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-60 transition flex items-center space-x-1.5"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      {confirmStatusUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-2xl ${
                  confirmStatusUser.isActive ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {confirmStatusUser.isActive ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {confirmStatusUser.isActive ? 'Deactivate User Account?' : 'Reactivate User Account?'}
                </h3>
                <p className="text-xs text-slate-500">{confirmStatusUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmStatusUser.isActive
                ? 'Deactivating this user will immediately revoke all active sessions and block them from logging in.'
                : 'Reactivating this user will restore their authorization and permit them to sign in again.'}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStatusUser(null)}
                className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isTogglingStatus}
                className={`py-2 px-4 rounded-xl text-white font-bold text-xs transition flex items-center space-x-1.5 ${
                  confirmStatusUser.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTogglingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{confirmStatusUser.isActive ? 'Confirm Deactivation' : 'Confirm Activation'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
