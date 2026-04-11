import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { ClipboardList, Download, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  actionType: string;
  documentId: string | null;
  userId: string;
  ipAddress: string | null;
  timestamp: string;
  user: { name: string; email: string; role: string };
}

export const AuditLogPage = () => {

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const actionTypes = ['UPLOAD', 'UPDATE', 'DELETE', 'DOWNLOAD', 'ROLLBACK', 'WORKFLOW_START', 'WORKFLOW_APPROVE', 'WORKFLOW_REJECT', 'WORKFLOW_ESCALATE', 'LOGIN', 'LOGOUT', 'AI_CHAT'];

  const actionColors: Record<string, string> = {
    UPLOAD: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    DOWNLOAD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    WORKFLOW_APPROVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    WORKFLOW_REJECT: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    LOGIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    DEFAULT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAction) params.set('actionType', filterAction);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set('actionType', filterAction);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);

      const res = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterUser && !log.user?.email?.toLowerCase().includes(filterUser.toLowerCase()) && !log.user?.name?.toLowerCase().includes(filterUser.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track all system actions and user activities</p>
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="To date"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Action</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">User</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Role</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Document</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">IP Address</th>
                <th className="px-6 py-4 text-left font-semibold text-slate-600 dark:text-slate-300">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    Loading audit logs...
                  </div>
                </td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No audit logs found</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${actionColors[log.actionType] || actionColors.DEFAULT}`}>
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {log.user?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{log.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{log.user?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{log.user?.role || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {log.documentId ? log.documentId.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{log.ipAddress || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500">
          Showing {filteredLogs.length} records • Audit logs are immutable and cannot be modified or deleted
        </div>
      </div>
    </div>
  );
};

export default { AuditLogPage };
