import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRoleDashboardPath } from '../utils/navigation';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (user) {
      navigate(getRoleDashboardPath(user.role), { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-200 shadow-sm">
        <FileQuestion className="w-8 h-8 text-indigo-600" />
      </div>

      <div className="max-w-md space-y-2 mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
          HTTP 404 • Resource Not Found
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          The requested institutional module, academic record, or endpoint URL does not exist or has been relocated.
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Go Back
        </button>
        <button
          onClick={handleReturn}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition"
        >
          <Home className="w-4 h-4 mr-1.5" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
