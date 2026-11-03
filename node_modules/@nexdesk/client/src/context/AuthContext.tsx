import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, ApiError } from '../api/client';
import { supabase } from '../utils/supabase/client';
import {
  auth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged
} from '../services/firebase';

export type LoginResult =
  | { requiresOtp: false; user: User }
  | {
      requiresOtp: true;
      challengeId: string;
      recipientMasked: string;
      expiresInSeconds: number;
      resendAvailableInSeconds: number;
      userId?: string;
    };

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  verifyLoginOtp: (challengeId: string, otp: string) => Promise<User>;
  resendLoginOtp: (challengeId: string) => Promise<{
    challengeId: string;
    recipientMasked: string;
    expiresInSeconds: number;
    resendAvailableInSeconds: number;
  }>;
  sendPasswordReset: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  syncGoogleUser: (payload: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    idToken?: string;
    accessToken?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setError(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Listen to Firebase auth state, but rely on backend session/token
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const serverData = await api.auth.firebaseAuth({ idToken });
          if (isMounted) {
            setUser(serverData.user);
            setError(null);
            setLoading(false);
          }
          return;
        } catch {
          // If Firebase token exchange fails, try session cookie / token
        }
      }
      if (isMounted) {
        await refreshUser();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    setError(null);

    const cleanIdentifier = identifier.trim();

    try {
      // 1. Direct backend universal login (enforces RBAC, password checks, and Email OTP challenges)
      try {
        const directData = await api.auth.login({ identifier: cleanIdentifier, password });

        if (directData.requiresOtp) {
          return {
            requiresOtp: true,
            challengeId: directData.challengeId!,
            recipientMasked: directData.recipientMasked || 'your registered email',
            expiresInSeconds: directData.expiresInSeconds || 300,
            resendAvailableInSeconds: directData.resendAvailableInSeconds || 60,
            userId: directData.userId
          };
        }

        if (directData.user) {
          setUser(directData.user);
          return { requiresOtp: false, user: directData.user };
        }
      } catch (dbErr: any) {
        // Fallback to Firebase Auth if user registered directly with Firebase and backend didn't find them
        if (cleanIdentifier.includes('@')) {
          try {
            const credential = await signInWithEmailAndPassword(auth, cleanIdentifier.toLowerCase(), password);
            const idToken = await credential.user.getIdToken();
            const serverData = await api.auth.firebaseAuth({ idToken });
            setUser(serverData.user);
            return { requiresOtp: false, user: serverData.user };
          } catch {
            // Firebase also rejected
          }
        }

        const msg = dbErr instanceof ApiError ? dbErr.detail : dbErr.message || '';
        if (
          msg.toLowerCase().includes('not registered') ||
          msg.toLowerCase().includes('not provisioned')
        ) {
          throw new Error('Your account is not registered. Please contact your administrator.');
        }
        if (msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('deactivated')) {
          throw new Error('Your account has been deactivated. Please contact your administrator.');
        }
        throw new Error(msg || 'Invalid credentials or user not found.');
      }

      throw new Error('Authentication failed.');
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.detail
          : err.message || 'Login failed. Please check credentials.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (challengeId: string, otp: string): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.auth.verifyLoginOtp({ challengeId, otp });
      setUser(result.user);
      return result.user;
    } catch (err: any) {
      const message = err instanceof ApiError ? err.detail : err.message || 'Invalid or expired OTP code.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async (challengeId: string) => {
    try {
      return await api.auth.resendOtp({ challengeId, purpose: 'LOGIN_VERIFICATION' });
    } catch (err: any) {
      const message = err instanceof ApiError ? err.detail : err.message || 'Failed to resend verification code.';
      throw new Error(message);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // For security, don't expose user existence, but handle cleanly
        return;
      }
      throw new Error(err.message || 'Failed to send password reset email.');
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      let idToken: string | null = null;
      try {
        const credential = await signInWithPopup(auth, googleProvider);
        idToken = await credential.user.getIdToken();
      } catch (popupErr: any) {
        if (
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          throw new Error('Google sign-in was cancelled.');
        }
        throw new Error(popupErr.message || 'Google sign-in encountered an error.');
      }

      if (!idToken) {
        throw new Error('Unable to retrieve authentication credentials from Google.');
      }

      try {
        const serverData = await api.auth.firebaseAuth({ idToken });
        setUser(serverData.user);
        return serverData.user;
      } catch (serverErr: any) {
        // Immediately sign out from Firebase on rejection to prevent orphan sessions
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignore
        }

        const rawMsg =
          serverErr instanceof ApiError
            ? serverErr.detail || serverErr.title
            : serverErr.message || '';

        if (
          serverErr.statusCode === 401 ||
          serverErr.statusCode === 403 ||
          rawMsg.toLowerCase().includes('not registered') ||
          rawMsg.toLowerCase().includes('not provisioned')
        ) {
          throw new Error('Your account is not registered. Please contact your administrator.');
        }

        throw new Error(rawMsg || 'Authentication failed. Please contact your administrator.');
      }
    } catch (err: any) {
      const msg = err.message || 'Google authentication failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const syncGoogleUser = async (payload: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    idToken?: string;
    accessToken?: string;
  }): Promise<User> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.auth.googleAuth(payload);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const rawMsg = err instanceof ApiError ? err.detail || err.title : err.message || '';
      if (
        err.statusCode === 401 ||
        err.statusCode === 403 ||
        rawMsg.toLowerCase().includes('not registered') ||
        rawMsg.toLowerCase().includes('not provisioned')
      ) {
        const msg = 'Your account is not registered. Please contact your administrator.';
        setError(msg);
        throw new Error(msg);
      }
      setError(rawMsg || 'Google authentication synchronization failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await api.auth.logout();
    } catch {
      // safe fallback
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // safe fallback
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // safe fallback
    }
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        verifyLoginOtp,
        resendLoginOtp,
        sendPasswordReset,
        loginWithGoogle,
        syncGoogleUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
