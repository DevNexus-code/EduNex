import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  X,
  BookOpen,
  Users,
  UserCheck,
  Mail,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath } from '../utils/navigation';

export const LoginPage: React.FC = () => {
  const { login, verifyLoginOtp, resendLoginOtp, loginWithGoogle, sendPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification Step State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState<{
    challengeId: string;
    recipientMasked: string;
    expiresInSeconds: number;
    resendAvailableInSeconds: number;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setResendNotice(null);

    try {
      const result = await login(identifier.trim(), password);

      if (result.requiresOtp) {
        setOtpChallenge({
          challengeId: result.challengeId,
          recipientMasked: result.recipientMasked,
          expiresInSeconds: result.expiresInSeconds,
          resendAvailableInSeconds: result.resendAvailableInSeconds
        });
        setResendCooldown(result.resendAvailableInSeconds || 60);
        setIsOtpStep(true);
        setOtpCode('');
        return;
      }

      navigate(getRoleDashboardPath(result.user.role), { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid institutional credentials or unprovisioned account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (!otpChallenge || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit numeric verification code.');
      return;
    }

    setIsOtpSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await verifyLoginOtp(otpChallenge.challengeId, cleanOtp);
      navigate(getRoleDashboardPath(user.role), { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired OTP code. Please check your email.');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpChallenge || resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setErrorMessage(null);
    setResendNotice(null);

    try {
      const updated = await resendLoginOtp(otpChallenge.challengeId);
      setOtpChallenge((prev) =>
        prev
          ? {
              ...prev,
              challengeId: updated.challengeId,
              expiresInSeconds: updated.expiresInSeconds
            }
          : null
      );
      setResendCooldown(updated.resendAvailableInSeconds || 60);
      setResendNotice(`A new 6-digit verification code has been dispatched to ${otpChallenge.recipientMasked}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code. Please wait.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    setErrorMessage(null);

    try {
      const authenticatedUser = await loginWithGoogle();
      navigate(getRoleDashboardPath(authenticatedUser.role), { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    setIsResetSubmitting(true);
    setResetError(null);

    try {
      await sendPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to dispatch password reset link.');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b18_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b18_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none"></div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon Capsule */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-2xl shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        {/* Brand Hierarchy */}
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              EDU<span className="text-indigo-400">NEX</span>
            </h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/30 tracking-wider">
              PORTAL
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
            Student & Staff Management System
          </p>
          <p className="text-sm font-medium text-slate-400 pt-1">
            Smart Academic Administration & Campus Management Platform.
          </p>
        </div>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl shadow-indigo-950/50 border border-slate-200/80 rounded-3xl sm:px-10">
          {/* Authentication Error Feedback */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Access Restricted</span>
                <span className="text-rose-600 block leading-relaxed">{errorMessage}</span>
              </div>
            </div>
          )}

          {isOtpStep ? (
            <div className="space-y-5 animate-fadeIn">
              {/* Step 2 Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100 shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Two-Factor Email Verification
                </h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  A single-use 6-digit security code has been sent to your registered institutional address:
                </p>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                  {otpChallenge?.recipientMasked || 'your registered email'}
                </div>
              </div>

              {resendNotice && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
                  <span>{resendNotice}</span>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      6-Digit Security OTP
                    </label>
                    <span className="text-[11px] font-semibold text-amber-600">
                      Expires in 5 mins
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="block w-full text-center tracking-[0.5em] text-2xl font-black font-mono py-3 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
                      placeholder="······"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400 text-center">
                    Single-use verification code. Plaintext codes are never permanently stored.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isOtpSubmitting || otpCode.trim().length !== 6}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl border border-transparent shadow-md shadow-indigo-500/20 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  {isOtpSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying code...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <span>Verify Code & Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpStep(false);
                      setErrorMessage(null);
                      setResendNotice(null);
                    }}
                    className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Back to Credentials</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed transition"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        <span>Resending...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      <span>Resend code in {resendCooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        <span>Resend Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 text-center">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Sign In to Your Campus Account
                </h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Enter your institutional credentials or authenticate with institutional Google Single Sign-On (SSO).
                </p>
              </div>

              {/* Primary Public Sign-In Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    User ID / Registered Mobile / Email Address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      placeholder="Student ID, Parent ID, Staff ID, Mobile or Email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(identifier.includes('@') ? identifier : '');
                        setResetSuccess(false);
                        setResetError(null);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl border border-transparent shadow-md shadow-indigo-500/20 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </button>
              </form>

              {/* Institutional SSO Divider */}
              <div className="mt-5 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[10px] font-bold text-slate-400 tracking-wider">
                    Or Continue With
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full mt-4 flex justify-center items-center py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition disabled:opacity-60"
              >
                {isGoogleSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Authenticating with Google...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                )}
              </button>
            </>
          )}

          {/* Institutional Provisioning Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-1">
            <p className="text-[11px] font-semibold text-slate-500">
              Authorized Institutional Access Only
            </p>
            <p className="text-[11px] text-slate-400">
              Student, Faculty, and Staff accounts are pre-provisioned by academic administration. If you are not registered, please contact your institutional administrator.
            </p>
          </div>
        </div>

        {/* Security Standards Footer */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-center space-x-3 text-slate-400 text-[11px]">
            <span className="flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Academic ERP
            </span>
            <span>•</span>
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Role-Based Access
            </span>
            <span>•</span>
            <span className="flex items-center">
              <Users className="w-3.5 h-3.5 mr-1 text-amber-400" /> Multi-Role Campus
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            Internal authorization roles (Admin, Principal, Teacher, Staff, Student, Parent) are enforced strictly server-side.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reset Institutional Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Password Reset Dispatched</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If an account exists for <strong className="text-slate-900">{resetEmail}</strong>, a secure password setup link has been sent to that address.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="pt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered institutional email address and we will generate a secure password reset link for your account.
                </p>

                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="name@edunex.edu"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-60 transition flex items-center space-x-1.5"
                  >
                    {isResetSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
