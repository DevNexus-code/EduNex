import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { RoleBadge } from '../components/common/Badges';
import { Role } from '../types';

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    loginId: string;
    expiresAt: string;
  } | null>(null);

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setTokenError('Activation token is missing. Please use the complete activation link provided in your email.');
      return;
    }

    const validateToken = async () => {
      try {
        setIsValidating(true);
        const data = await api.auth.verifyActivationToken(token);
        setUserInfo(data);
        setTokenError(null);
      } catch (err: any) {
        setTokenError(err.message || 'The activation link is invalid, expired, or has already been used.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && hasUpper && hasLower && hasDigitOrSpecial && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.auth.completeActivation({
        token,
        newPassword: password
      });
      setActivationSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete account activation. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Background Decorative Pattern */}
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
              ACTIVATION
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
            Student & Staff Management System
          </p>
          <p className="text-sm font-medium text-slate-400 pt-1">
            Official Campus Account Onboarding & Secure Credential Setup
          </p>
        </div>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl shadow-indigo-950/50 border border-slate-200/80 rounded-3xl sm:px-10">
          {isValidating ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Verifying Activation Credentials...</p>
              <p className="text-xs text-slate-500">Checking link authorization with the institutional security server.</p>
            </div>
          ) : tokenError ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Activation Link Invalid</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{tokenError}</p>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">What to do next:</p>
                <p>• If you previously configured your password, you can sign in directly.</p>
                <p>• If this link expired, ask your campus administrator to resend an activation link.</p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Go to Campus Login
              </Link>
            </div>
          ) : activationSuccess ? (
            <div className="py-6 text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Account Activated!</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your password has been configured and your institutional account is now fully active.
              </p>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Assigned Login ID:</span>
                  <span className="font-mono font-bold text-indigo-600">{userInfo?.loginId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Registered Email:</span>
                  <span className="font-semibold text-slate-800">{userInfo?.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <RoleBadge role={(userInfo?.role as Role) || 'STUDENT'} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              {/* Account Welcome Banner */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 border border-indigo-100">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Activate Your Account
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Welcome to EDUNEX, <strong className="text-slate-800">{userInfo?.firstName} {userInfo?.lastName}</strong>.
                </p>
              </div>

              {/* Account Metadata Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Login ID:</span>
                  <span className="font-mono font-bold text-slate-900">{userInfo?.loginId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-semibold text-slate-800">{userInfo?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Assigned Role:</span>
                  <RoleBadge role={(userInfo?.role as Role) || 'STUDENT'} />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Password Setup Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Create New Password *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-[11px]">
                  <p className="font-bold text-slate-700 mb-1">Security Requirements:</p>
                  <div className="flex items-center space-x-2">
                    <span className={hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasMinLength ? '✓' : '○'} At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasUpper ? '✓' : '○'} One uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={hasLower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasLower ? '✓' : '○'} One lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={hasDigitOrSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasDigitOrSpecial ? '✓' : '○'} One number or special symbol
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={passwordsMatch ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordsMatch ? '✓' : '○'} Passwords match
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl border border-transparent shadow-md shadow-indigo-500/20 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Activating account...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      <span>Set Password & Activate</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
