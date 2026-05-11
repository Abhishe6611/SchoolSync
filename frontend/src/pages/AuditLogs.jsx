import { useEffect, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { formatDateTime } from "../utils/dateFormatter.js";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const response = await api.get(`/audit/?skip=${skip}&limit=${limit}`);
      setLogs(response.data.items);
      setTotalPages(response.data.pages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => 
    log.user_email.toLowerCase().includes(search.toLowerCase()) ||
    log.entity.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action) => {
    switch (action) {
      case "CREATE": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE": return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-[#f8f9fa] text-[#495057] border-[#e9ecef]";
    }
  };

  return (
    <div className="space-y-5">
      <div className="animate-slide-up">
        <h1 className="page-title">Audit Logs</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Track system activity and user actions.</p>
      </div>

      <div className="card animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="mb-5 max-w-md">
          <div className="relative flex items-center rounded-lg border bg-white overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
            <div className="pointer-events-none flex items-center pl-3.5">
              <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search by email, entity, or action..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="relative overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
          <table className="w-full text-left text-sm text-[#212529]">
            <thead className="bg-[#f8f9fa] text-[11px] font-bold uppercase tracking-wider text-[#868e96]">
              <tr>
                <th className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>Timestamp</th>
                <th className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>User</th>
                <th className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>Action</th>
                <th className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>Entity</th>
                <th className="px-5 py-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-[#868e96]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#212529] border-t-transparent"></div>
                      <p className="text-xs">Loading logs...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-[#868e96] text-xs">
                    No logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-[#f8f9fa] transition-colors" style={{ borderColor: "var(--color-border-light)" }}>
                    <td className="whitespace-nowrap px-5 py-3 text-[13px] text-[#495057] font-medium">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3 text-[13px]">{log.user_email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getActionColor(log.action)} uppercase tracking-wider`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      <span className="font-semibold text-[#212529]">{log.entity}</span> <span className="text-[#adb5bd]">(ID: {log.entity_id})</span>
                    </td>
                    <td className="px-5 py-3 text-[11px] font-mono text-[#868e96] max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={logs.length} pageSize={limit} />
        </div>
      </div>
    </div>
  );
}
