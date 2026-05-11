import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function StaffAttendance() {
  const [staff, setStaff] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Start with current month/year
  const [regMonth, setRegMonth] = useState(new Date().getMonth());
  const [regYear, setRegYear] = useState(new Date().getFullYear());
  const [bulkDate, setBulkDate] = useState("");
  const [error, setError] = useState("");

  // 1. Fetch Staff
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get("/staff");
        // Only active staff usually
        setStaff(res.data.filter(s => s.is_active));
      } catch (err) {
        console.error(err);
      }
    };
    fetchStaff();
  }, []);

  // 2. Fetch Attendance for selected month
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // API expects month (1-12)
      const res = await api.get(`/staff-attendance?year=${regYear}&month=${regMonth + 1}`);
      setAttendanceRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [regMonth, regYear]);

  // Helpers
  const daysInMonth = new Date(regYear, regMonth + 1, 0).getDate();
  const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map: student_id -> { day: status }
  const regMap = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(r => {
      // r.date is "YYYY-MM-DD"
      const day = Number(r.date.split("-")[2]);
      if (!map[r.staff_id]) map[r.staff_id] = {};
      map[r.staff_id][day] = r.status;
    });
    return map;
  }, [attendanceRecords]);

  // Column totals
  const dayTotals = useMemo(() => {
    const totals = {};
    dayColumns.forEach(d => {
      let p = 0, t = 0;
      staff.forEach(s => {
        const st = regMap[s.id]?.[d];
        if (st) {
          if (st.toLowerCase() === "present") { p++; t++; }
          else if (st.toLowerCase() === "absent") { t++; }
        }
      });
      totals[d] = { p, t };
    });
    return totals;
  }, [dayColumns, staff, regMap]);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  // Cell Styles
  const cellStyle = (status) => {
    if (!status) return "text-[#ced4da] cursor-pointer hover:bg-gray-50";
    const s = status.toLowerCase();
    if (s === "present") return "bg-emerald-50 text-emerald-700 font-bold cursor-pointer hover:bg-emerald-100";
    if (s === "absent") return "bg-red-50 text-red-600 font-bold cursor-pointer hover:bg-red-100";
    if (s === "holiday") return "bg-blue-50 text-blue-600 font-bold cursor-pointer hover:bg-blue-100";
    if (s === "training") return "bg-purple-50 text-purple-600 font-bold cursor-pointer hover:bg-purple-100";
    return "cursor-pointer hover:bg-gray-50";
  };
  const cellLabel = (status) => {
    if (!status) return "—";
    const s = status.toLowerCase();
    if (s === "present") return "P";
    if (s === "absent") return "A";
    if (s === "holiday") return "H";
    if (s === "training") return "T";
    return s[0].toUpperCase();
  };

  // Toggle state cycler: null -> Present -> Absent -> Holiday -> Training -> Present...
  const getNextStatus = (current) => {
    if (!current) return "present";
    const s = current.toLowerCase();
    if (s === "present") return "absent";
    if (s === "absent") return "holiday";
    if (s === "holiday") return "training";
    return "present";
  };

  // Click handler
  const handleCellClick = async (staffId, day, currentStatus) => {
    const dateStr = `${regYear}-${String(regMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr > todayStr) {
      setError("Cannot mark attendance for future dates.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    const nextStatus = getNextStatus(currentStatus);
    
    // Optimistic UI update
    const tempId = Date.now();
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.staff_id === staffId && r.date === dateStr));
      return [...filtered, { id: tempId, staff_id: staffId, date: dateStr, status: nextStatus }];
    });

    try {
      await api.post("/staff-attendance", {
        staff_id: staffId,
        date: dateStr,
        status: nextStatus,
        remarks: ""
      });
      // Optionally re-fetch quietly or let the optimistic update stand
    } catch (err) {
      console.error(err);
      // Revert if error
      fetchAttendance();
    }
  };

  const handleBulkAction = async (status) => {
    if (!bulkDate) {
      setError("Please select a date for bulk action.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (bulkDate > todayStr) {
      setError("Cannot perform bulk actions for future dates.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/staff-attendance/mark-all", { date: bulkDate, status });
      fetchAttendance();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Staff Attendance</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">
            Full attendance register for all active staff
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50/80 backdrop-blur-sm border border-red-100 p-3 flex gap-3 text-red-600 animate-fade-in">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[13px] font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <div className="space-y-4 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        {/* Month/Year selector */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Month</label>
              <select className="select-field" value={regMonth} onChange={e => setRegMonth(Number(e.target.value))}>
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Year</label>
              <select className="select-field" value={regYear} onChange={e => setRegYear(Number(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row sm:items-end justify-center gap-3 border-l border-[#e9ecef] pl-4 ml-2">
              <div>
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Bulk Action Date</label>
                <input type="date" className="input-field py-2" value={bulkDate} max={new Date().toISOString().split("T")[0]} onChange={e => setBulkDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleBulkAction('present')} disabled={saving} className="btn-primary py-2 px-3 text-[12px] bg-emerald-600 hover:bg-emerald-700">All Present</button>
                <button onClick={() => handleBulkAction('holiday')} disabled={saving} className="btn-primary py-2 px-3 text-[12px] bg-blue-600 hover:bg-blue-700">All Holiday</button>
                <button onClick={() => handleBulkAction('training')} disabled={saving} className="btn-primary py-2 px-3 text-[12px] bg-purple-600 hover:bg-purple-700">All Training</button>
              </div>
            </div>

            <div className="flex-1"></div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#e9ecef] flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[#868e96]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-200"></span> P = Present</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-200"></span> A = Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200"></span> H = Holiday</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-200"></span> T = Training</span>
            <span className="flex items-center gap-1.5 text-[#adb5bd]"><span className="w-2.5 h-2.5 rounded bg-[#f1f3f5] border border-[#e9ecef]"></span> — = No Data</span>
          </div>
        </div>

        {/* Grid */}
        <div className="card overflow-hidden p-0 border border-[#e9ecef] relative">
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#4263eb] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="text-[11px] border-collapse" style={{ minWidth: `${daysInMonth * 36 + 250}px` }}>
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-[#e9ecef]">
                  <th className="sticky left-0 bg-[#f8f9fa] z-10 px-3 py-3 text-left text-[10px] uppercase tracking-wider text-[#868e96] font-bold border-r border-[#e9ecef]" style={{ minWidth: "180px" }}>Staff Member</th>
                  {dayColumns.map(d => (
                    <th key={d} className="px-0 py-3 text-center text-[10px] font-bold text-[#495057] border-r border-[#f1f3f5]" style={{ minWidth: "32px" }}>{d}</th>
                  ))}
                  <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#868e96] font-bold border-l border-[#e9ecef]" style={{ minWidth: "60px" }}>Total</th>
                  <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#868e96] font-bold" style={{ minWidth: "50px" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s, idx) => {
                  const sMap = regMap[s.id] || {};
                  let totalP = 0, totalW = 0;
                  dayColumns.forEach(d => {
                    const st = sMap[d];
                    if (st) {
                      if (st.toLowerCase() === "present") { totalP++; totalW++; }
                      else if (st.toLowerCase() === "absent") { totalW++; }
                    }
                  });
                  const pct = totalW > 0 ? Math.round((totalP / totalW) * 100) : 0;
                  return (
                    <tr key={s.id} className={`border-b border-[#f1f3f5] ${idx % 2 === 0 ? "" : "bg-[#fafbfc]"}`}>
                      <td className="sticky left-0 bg-white z-10 px-3 py-2 font-semibold text-[#212529] border-r border-[#e9ecef] whitespace-nowrap" style={idx % 2 !== 0 ? { backgroundColor: "#fafbfc" } : {}}>
                        <div className="flex flex-col">
                          <span>{s.first_name} {s.last_name}</span>
                          <span className="text-[9px] font-normal text-[#868e96] uppercase">{s.role}</span>
                        </div>
                      </td>
                      {dayColumns.map(d => {
                        const st = sMap[d];
                        return (
                          <td 
                            key={d} 
                            onClick={() => handleCellClick(s.id, d, st)}
                            className={`px-0 py-2 text-center border-r border-[#f1f3f5] transition-colors ${cellStyle(st)}`}
                          >
                            {cellLabel(st)}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-[#212529] border-l border-[#e9ecef]">{totalP}/{totalW}</td>
                      <td className={`px-2 py-2 text-center font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600"}`}>{pct}%</td>
                    </tr>
                  );
                })}
                {/* Summary Row */}
                <tr className="bg-[#f8f9fa] border-t-2 border-[#dee2e6]">
                  <td className="sticky left-0 bg-[#f8f9fa] z-10 px-3 py-2.5 font-bold text-[11px] text-[#495057] uppercase tracking-wider border-r border-[#e9ecef]">Day Total</td>
                  {dayColumns.map(d => {
                    const dt = dayTotals[d] || { p: 0, t: 0 };
                    return (
                      <td key={d} className="px-0 py-2.5 text-center font-bold text-[#495057] border-r border-[#f1f3f5]">
                        {dt.t > 0 ? dt.p : "—"}
                      </td>
                    );
                  })}
                  <td className="border-l border-[#e9ecef]"></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
