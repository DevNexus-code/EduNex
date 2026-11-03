import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.auditLogs.list({
        action: actionFilter || undefined
      });
      setLogs(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          System Security & Audit Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Immutable audit log recording user actions, student admissions, fee collections, grade modifications, and authentication events.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center">
        <Search className="w-4 h-4 text-slate-400 mr-2.5" />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter audit actions (e.g. CREATE, PAYMENT, ADMISSION)..."
          className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-500 font-semibold">Loading security audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No audit events recorded.</p>
            <p className="text-xs text-slate-400">Events will appear as users interact with the system.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 font-sans">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{log.actorName || 'System'}</span>
                      <span className="text-[11px] text-slate-400 block">{log.actorEmail}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{log.targetId || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details ? (
                        <button
                          onClick={() => setSelectedDetails(log.details)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                        >
                          View Payload
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Audit Event Metadata</h3>
              <button onClick={() => setSelectedDetails(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                Close
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-96">
              {JSON.stringify(selectedDetails, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
