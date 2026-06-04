import { useState, useEffect } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/dateFormatter";

export default function LeaveApproval() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState("");

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher-leaves/?status_filter=${filter}`);
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this leave request?")) return;
    try {
      await api.patch(`/teacher-leaves/${id}/action`, {
        status: "approved",
        admin_remarks: null
      });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    }
  };

  const openRejectModal = (id) => {
    setSelectedLeaveId(id);
    setAdminRemarks("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedLeaveId) return;
    try {
      await api.patch(`/teacher-leaves/${selectedLeaveId}/action`, {
        status: "rejected",
        admin_remarks: adminRemarks
      });
      setRejectModalOpen(false);
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#212529]">Staff Leave Approvals</h1>
          <p className="text-sm text-[#868e96] mt-1">Review and manage leave requests from teachers and staff</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="input-field py-2 text-sm bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={fetchLeaves} className="btn-secondary py-2" title="Refresh">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden animate-slide-up">
        <div className="table-container">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8f9fa] text-xs font-bold uppercase tracking-wider text-[#868e96]">
              <tr>
                <th className="px-6 py-4">Applied</th>
                <th className="px-6 py-4">Staff Name</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {leaves.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-[#868e96]">No requests found.</td></tr>
              ) : leaves.map(l => (
                <tr key={l.id} className="hover:bg-[#f8f9fa] transition-colors">
                  <td className="px-6 py-4 text-[#495057]">{formatDate(l.applied_on)}</td>
                  <td className="px-6 py-4 font-bold text-[#212529]">{l.staff_name}</td>
                  <td className="px-6 py-4 font-semibold text-[#495057]">{l.leave_type}</td>
                  <td className="px-6 py-4 text-[#495057]">
                    {formatDate(l.from_date)} <span className="text-[#adb5bd]">to</span> {formatDate(l.to_date)}
                    <div className="text-xs font-bold text-indigo-600 mt-0.5">{l.total_days} Days</div>
                  </td>
                  <td className="px-6 py-4 text-[#495057] max-w-xs truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-6 py-4">
                    {l.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>}
                    {l.status === 'approved' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200" title={l.admin_remarks ? `Remarks: ${l.admin_remarks}` : ""}>Approved</span>}
                    {l.status === 'rejected' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-600 border border-red-200" title={l.admin_remarks ? `Remarks: ${l.admin_remarks}` : ""}>Rejected</span>}
                    {l.status === 'cancelled' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">Cancelled</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {l.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleApprove(l.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">Approve</button>
                        <button onClick={() => openRejectModal(l.id)} className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">Reject</button>
                      </div>
                    ) : (
                      <span className="text-[#adb5bd]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#f1f3f5] flex justify-between items-center bg-[#f8f9fa]">
              <h3 className="font-bold font-heading text-[#212529]">Reject Leave Request</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-[#adb5bd] hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">Remarks (Optional)</label>
                <textarea 
                  className="input-field resize-y min-h-[100px]" 
                  placeholder="Why is this leave being rejected?" 
                  value={adminRemarks} 
                  onChange={(e) => setAdminRemarks(e.target.value)} 
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#f1f3f5] bg-[#f8f9fa] flex justify-end gap-3">
              <button onClick={() => setRejectModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Reject Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
