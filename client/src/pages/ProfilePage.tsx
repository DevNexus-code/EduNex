import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Mail,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { RoleBadge } from '../components/common/Badges';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, sendPasswordReset } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password reset
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Sensitive Profile Update OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpRecipientMasked, setOtpRecipientMasked] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpModalError, setOtpModalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.users.getSelfProfile();
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      firstName,
      lastName,
      phone,
      bio,
      avatarUrl: avatarUrl || undefined
    };

    try {
      // If phone changed, initiate sensitive profile update check
      const phoneChanged = phone.trim() !== (profile?.phone || '').trim();
      const hasExternalEmail = user?.email && !user.email.endsWith('@internal.edunex.local');

      if (phoneChanged && hasExternalEmail) {
        const challengeRes = await api.users.requestProfileUpdate(payload);
        if (challengeRes.requiresOtp && challengeRes.challengeId) {
          setOtpChallengeId(challengeRes.challengeId);
          setOtpRecipientMasked(challengeRes.recipientMasked || user?.email || 'your email');
          setOtpCode('');
          setOtpModalError(null);
          setShowOtpModal(true);
          return;
        }
      }

      await api.users.updateSelfProfile(payload);
      setMessage('Profile updated successfully.');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyProfileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setOtpModalError('Please enter the 6-digit verification code.');
      return;
    }

    setIsOtpVerifying(true);
    setOtpModalError(null);

    try {
      const updatedUser = await api.users.verifyProfileUpdate({
        challengeId: otpChallengeId,
        otp: cleanOtp
      });
      setProfile(updatedUser);
      setShowOtpModal(false);
      setMessage('Profile contact details verified and updated successfully.');
      await refreshUser();
    } catch (err: any) {
      setOtpModalError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetSending(true);
    try {
      await sendPasswordReset(user.email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setResetSending(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.users.removeAvatar();
      setAvatarUrl('');
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to remove avatar.');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-2 text-xs text-slate-500 font-semibold">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          User Account & Personal Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your institutional identity, security credentials, contact details, and avatar.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Identity Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 text-center">
          <div className="relative inline-block mx-auto">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={firstName}
                className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-indigo-100 text-indigo-600 font-black text-2xl flex items-center justify-center shadow-md">
                {firstName[0]}
                {lastName[0]}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">
              {firstName} {lastName}
            </h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="pt-2 flex flex-col items-center gap-1.5">
              {user?.role && <RoleBadge role={user.role} />}
              {user?.isEmailVerified ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                  Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                  Pending Email Verification
                </span>
              )}
            </div>
          </div>

          {/* Linked Institution Profile */}
          {profile?.staffProfile && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                <Briefcase className="w-4 h-4" />
                <span>Staff Profile</span>
              </div>
              <p>
                <span className="text-slate-400">Designation:</span> {profile.staffProfile.designation}
              </p>
              <p>
                <span className="text-slate-400">Department:</span> {profile.staffProfile.department?.name || 'General'}
              </p>
              <p>
                <span className="text-slate-400">Staff ID:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{profile.staffProfile.staffId}</span>
              </p>
            </div>
          )}

          {profile?.studentProfile && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                <GraduationCap className="w-4 h-4" />
                <span>Student Profile</span>
              </div>
              <p>
                <span className="text-slate-400">Course:</span> {profile.studentProfile.course?.name}
              </p>
              <p>
                <span className="text-slate-400">Student ID:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{profile.studentProfile.studentId}</span>
              </p>
            </div>
          )}

          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center justify-center space-x-1 mx-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Avatar</span>
            </button>
          )}
        </div>

        {/* Edit Details & Security Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Personal & Contact Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Institutional email address is managed exclusively by administrators.
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Phone Number</label>
                  <span className="text-[10px] text-indigo-600 font-semibold">Protected with Email OTP</span>
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bio / Notes</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Short personal bio or notes..."
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-60 flex items-center space-x-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Reset Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Password & Security</span>
            </h3>
            <p className="text-xs text-slate-500">
              Need to change your account password? Send an authenticated password reset link to your email.
            </p>
            {resetSent ? (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Password reset instructions have been dispatched to your email address.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetSending}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-60"
              >
                {resetSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Password Reset Email</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sensitive Profile Update OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Confirm Profile Modification</h3>
              </div>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyProfileOtp} className="pt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Modifying critical contact details requires security verification. A 6-digit confirmation code has been dispatched to:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 text-center font-mono">
                {otpRecipientMasked}
              </div>

              {otpModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                  <span>{otpModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="block w-full text-center tracking-[0.5em] text-2xl font-black font-mono py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                  placeholder="······"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOtpVerifying || otpCode.trim().length !== 6}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-60 transition flex items-center space-x-1.5"
                >
                  {isOtpVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Apply Update</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};