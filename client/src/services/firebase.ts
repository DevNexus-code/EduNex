import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDTeMRb_lOqpXVzp4G5BPC8KGulKKNcAzQ",
  authDomain: "intense-hour-469705-n2.firebaseapp.com",
  projectId: "intense-hour-469705-n2",
  storageBucket: "intense-hour-469705-n2.firebasestorage.app",
  messagingSenderId: "868685659237",
  appId: "1:868685659237:web:0df51ab8ee1a9978bc9a8c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
};
export type { FirebaseUser };
export default app;
