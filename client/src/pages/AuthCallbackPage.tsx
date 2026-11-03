import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncGoogleUser } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfigError, setIsConfigError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      try {
        // Check for URL error parameters from OAuth provider
        const urlError = searchParams.get('error_description') || searchParams.get('error');
        if (urlError) {
          if (
            urlError.toLowerCase().includes('provider is not enabled') ||
            urlError.toLowerCase().includes('unsupported provider') ||
            urlError.toLowerCase().includes('oauth')
          ) {
            setIsConfigError(true);
          }
          throw new Error(urlError);
        }

        // Retrieve OAuth session from Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const sbUser = sessionData.session?.user;

        if (!sbUser || !sbUser.email) {
          // Check if session event fires via auth state change listener
          const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user?.email && isMounted) {
              await exchangeBackendSession(session.user, session.access_token);
            }
          });

          // Wait brief moment for URL hash parsing
          setTimeout(() => {
            if (isMounted && status === 'loading') {
              authListener.subscription.unsubscribe();
              setErrorMessage('No authentication session was returned from Google. Please try again.');
              setStatus('error');
            }
          }, 3500);
          return;
        }

        if (isMounted) {
          await exchangeBackendSession(sbUser, sessionData.session?.access_token);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'Authentication failed during Google OAuth callback.';
        setErrorMessage(msg);
        if (
          msg.toLowerCase().includes('provider is not enabled') ||
          msg.toLowerCase().includes('unsupported provider')
        ) {
          setIsConfigError(true);
        }
        setStatus('error');
      }
    };

    const exchangeBackendSession = async (sbUser: any, accessToken?: string) => {
      try {
        const metadata = sbUser.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || sbUser.email.split('@')[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';
        const avatarUrl = metadata.avatar_url || metadata.picture || null;
        const googleId = sbUser.identities?.[0]?.id || sbUser.id;

        await syncGoogleUser({
          googleId,
          email: sbUser.email,
          firstName,
          lastName,
          avatarUrl,
          accessToken,
        });

        if (isMounted) {
          setStatus('success');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 600);
        }
      } catch (backendErr: any) {
        if (!isMounted) return;
        setErrorMessage(backendErr.detail || backendErr.message || 'Failed to initialize session with backend.');
        setStatus('error');
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, [searchParams, syncGoogleUser, navigate, status]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200 sm:rounded-2xl sm:px-10 text-center">
          {status === 'loading' && (
            <div className="py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Authenticating with Google...
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Securing your session token and loading your assigned enterprise permissions.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Authentication Successful
              </h2>
              <p className="text-xs text-slate-500">
                Redirecting to your EDUNEX campus dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4 text-left">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-50">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Authentication Issue
                  </h2>
                  <p className="text-xs text-rose-600 font-medium">
                    Google OAuth exchange did not complete
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-800 break-words">
                {errorMessage}
              </div>

              {isConfigError && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 space-y-2.5">
                  <div className="flex items-center space-x-1.5 font-bold text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Supabase Google Provider Setup Guide:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                    <li>Open your Supabase Project Dashboard.</li>
                    <li>Navigate to <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Google</strong>.</li>
                    <li>Enable the Google toggle and input your Google Client ID and Secret.</li>
                    <li>Add the redirect URI to your Google Cloud Console Credentials.</li>
                  </ol>
                  <a
                    href="https://supabase.com/docs/guides/auth/social-login/auth-google"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Read official Supabase Google Auth documentation</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
