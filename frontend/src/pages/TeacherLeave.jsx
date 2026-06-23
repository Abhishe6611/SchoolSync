import { useState, useEffect } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/dateFormatter";

const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Earned Leave", "Maternity Leave", "Half Day"];

export default function TeacherLeave() {
  const [activeTab, setActiveTab] = useState("apply"); // apply, history
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/teacher-leaves/my");
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    if (leaveType === "Half Day") return 0.5;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client side validation
    const today = new Date().toISOString().split('T')[0];
    if (fromDate < today) {
      setError("Cannot apply for leave on past dates.");
      return;
    }
    if (fromDate > toDate) {
      setError("From date cannot be after to date.");
      return;
    }
    if (leaveType === "Sick Leave" && !reason.trim()) {
      setError("Reason is mandatory for Sick Leave.");
      return;
    }
    if (leaveType === "Half Day" && fromDate !== toDate) {
      setError("Half Day leave must be for a single date.");
      return;
    }
    if (calculateDays() > 30) {
      setError("Cannot apply for more than 30 days of leave at once.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/teacher-leaves", {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason
      });
      setSuccess("Leave request submitted successfully!");
      setLeaveType("Casual Leave");
      setFromDate("");
      setToDate("");
      setReason("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;
    try {
      await api.patch(`/teacher-leaves/${leaveId}/cancel`);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel leave.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-[#212529]">Leave Management</h1>
          <p className="text-sm text-[#868e96] mt-1">Apply for leave and track your requests</p>
        </div>
      </div>

      <div className="flex items-center gap-0 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button type="button" onClick={() => setActiveTab("apply")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "apply" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Apply for Leave
        </button>
        <button type="button" onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "history" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Leave History
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 border border-emerald-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="flex-1">{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {activeTab === "apply" && (
        <div className="card p-6 max-w-2xl animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">Leave Type</label>
              <select 
                className="input-field"
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                required
              >
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">From Date</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={fromDate}
                  onChange={e => {
                    setFromDate(e.target.value);
                    if (leaveType === "Half Day") setToDate(e.target.value);
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">To Date</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  disabled={leaveType === "Half Day"}
                  required
                />
              </div>
            </div>
            
            {fromDate && toDate && (
              <div className="bg-[#f8f9fa] rounded-lg p-3 text-sm text-[#495057] font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Total Duration: <span className="text-indigo-600 font-bold">{calculateDays()} Days</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#868e96] uppercase tracking-wider mb-2">Reason {leaveType === "Sick Leave" && <span className="text-red-500">*</span>}</label>
              <textarea 
                className="input-field min-h-[100px] resize-y"
                placeholder="Please provide a valid reason..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                required={leaveType === "Sick Leave"}
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto">
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "history" && (
        <div className="card overflow-hidden animate-slide-up">
          <div className="table-container">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9fa] text-xs font-bold uppercase tracking-wider text-[#868e96]">
                <tr>
                  <th className="px-6 py-4">Applied On</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {leaves.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-[#868e96]">No leave history found.</td></tr>
                ) : leaves.map(l => (
                  <tr key={l.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4 text-[#495057]">{formatDate(l.applied_on)}</td>
                    <td className="px-6 py-4 font-semibold text-[#212529]">{l.leave_type}</td>
                    <td className="px-6 py-4 text-[#495057]">
                      {formatDate(l.from_date)} <span className="text-[#adb5bd]">to</span> {formatDate(l.to_date)}
                      <div className="text-xs font-bold text-indigo-600 mt-0.5">{l.total_days} Days</div>
                    </td>
                    <td className="px-6 py-4 text-[#495057] max-w-xs truncate" title={l.reason}>{l.reason}</td>
                    <td className="px-6 py-4">
                      {l.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">Pending</span>}
                      {l.status === 'approved' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>}
                      {l.status === 'rejected' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-50 text-red-600 border border-red-200" title={l.admin_remarks}>Rejected</span>}
                      {l.status === 'cancelled' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">Cancelled</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {l.status === 'pending' ? (
                        <button onClick={() => handleCancel(l.id)} className="text-xs font-bold text-red-500 hover:text-red-700">Cancel</button>
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
      )}
    </div>
  );
}
