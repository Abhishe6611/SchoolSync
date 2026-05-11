import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Attendance() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [tab, setTab] = useState("overview"); // overview | mark | register
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [overview, setOverview] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regMonth, setRegMonth] = useState(new Date().getMonth());
  const [regYear, setRegYear] = useState(new Date().getFullYear());

  // ── Fetch base data ──
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([api.get("/classes"), api.get("/students")]);
        setClasses(cRes.data);
        setStudents(sRes.data);
      } catch (err) { console.error(err); }
    };
    fetchBaseData();
  }, []);

  // ── Fetch overview ──
  const fetchOverview = async () => {
    try {
      const res = await api.get("/attendance/overview");
      setOverview(res.data);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { if (tab === "overview") fetchOverview(); }, [tab]);

  // ── Fetch attendance for selected class ──
  const fetchAttendance = async (classId) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?class_id=${classId}`);
      setAttendanceRecords(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (selectedClassId && tab !== "overview") fetchAttendance(selectedClassId); }, [selectedClassId]);

  const filteredClasses = isTeacher
    ? classes.filter(c => String(c.advisor_id) === String(user?.staff_id))
    : classes;

  const classStudents = useMemo(() => students.filter(s => String(s.class_id) === String(selectedClassId)), [students, selectedClassId]);

  const currentDayMap = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(r => { if (r.date === selectedDate) map[r.student_id] = r; });
    return map;
  }, [attendanceRecords, selectedDate]);

  const selectedClassName = useMemo(() => {
    const cls = classes.find(c => String(c.id) === String(selectedClassId));
    return cls ? `${cls.name} ${cls.section}` : "";
  }, [classes, selectedClassId]);

  // ── Actions ──
  const handleMarkAttendance = async (studentId, status) => {
    if (!isTeacher) return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate > todayStr) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Cannot mark attendance for future dates.", type: 'error' } }));
      return;
    }
    const existing = currentDayMap[studentId];
    if (existing && existing.status === status) return;
    try {
      if (existing) {
        await api.put(`/attendance/${existing.id}`, { ...existing, status });
      } else {
        await api.post("/attendance", { student_id: studentId, class_id: Number(selectedClassId), date: selectedDate, status, remarks: "" });
      }
      setAttendanceRecords(prev => {
        if (existing) return prev.map(r => r.id === existing.id ? { ...r, status } : r);
        api.get(`/attendance?class_id=${selectedClassId}`).then(res => setAttendanceRecords(res.data));
        return [...prev, { student_id: studentId, date: selectedDate, status, class_id: Number(selectedClassId) }];
      });
    } catch (err) { console.error(err); }
  };

  const handleBulkAction = async (action) => {
    if (!isTeacher) return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate > todayStr) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Cannot mark attendance for future dates.", type: 'error' } }));
      return;
    }
    setSaving(true);
    try {
      if (action === "holiday") {
        await api.post("/attendance/mark-holiday", { class_id: Number(selectedClassId), date: selectedDate });
      } else {
        await api.post("/attendance/mark-all", { class_id: Number(selectedClassId), date: selectedDate, status: action });
      }
      await fetchAttendance(selectedClassId);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const openMarkTab = (classId) => {
    setSelectedClassId(String(classId));
    setTab("mark");
  };
  const openRegisterTab = (classId) => {
    setSelectedClassId(String(classId));
    setTab("register");
  };

  // ── Register (Excel) helpers ──
  const daysInMonth = new Date(regYear, regMonth + 1, 0).getDate();
  const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const regRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      const [y, m] = r.date.split("-");
      return Number(y) === regYear && Number(m) === regMonth + 1;
    });
  }, [attendanceRecords, regYear, regMonth]);

  const regMap = useMemo(() => {
    const map = {};
    regRecords.forEach(r => {
      const day = Number(r.date.split("-")[2]);
      if (!map[r.student_id]) map[r.student_id] = {};
      map[r.student_id][day] = r.status;
    });
    return map;
  }, [regRecords]);

  const dayTotals = useMemo(() => {
    const totals = {};
    dayColumns.forEach(d => {
      let p = 0, t = 0;
      classStudents.forEach(s => {
        const st = regMap[s.id]?.[d];
        if (st) { if (st.toLowerCase() === "present") { p++; t++; } else if (st.toLowerCase() === "absent") { t++; } }
      });
      totals[d] = { p, t };
    });
    return totals;
  }, [dayColumns, classStudents, regMap]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const cellStyle = (status) => {
    if (!status) return "text-[#ced4da]";
    const s = status.toLowerCase();
    if (s === "present") return "bg-emerald-50 text-emerald-700 font-bold";
    if (s === "absent") return "bg-red-50 text-red-600 font-bold";
    if (s === "holiday") return "bg-blue-50 text-blue-600 font-bold";
    return "";
  };
  const cellLabel = (status) => {
    if (!status) return "—";
    const s = status.toLowerCase();
    if (s === "present") return "P";
    if (s === "absent") return "A";
    if (s === "holiday") return "H";
    return s[0].toUpperCase();
  };

  // ════════════════ RENDER ════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Attendance Register</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">
            {tab === "overview" ? "Class-wise attendance overview for this month." : tab === "mark" ? `Marking attendance for ${selectedClassName}` : `Full register for ${selectedClassName}`}
          </p>
        </div>
        {tab !== "overview" && (
          <button onClick={() => setTab("overview")} className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Overview
          </button>
        )}
      </div>

      {/* ═══════ TAB 1: OVERVIEW ═══════ */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "80ms", opacity: 0, animationFillMode: "forwards" }}>
          {(isTeacher ? overview.filter(o => filteredClasses.some(c => c.id === o.class_id)) : overview).map((cls) => {
            const pct = cls.month_pct;
            const pctColor = pct >= 80 ? "#40c057" : pct >= 60 ? "#fab005" : "#fa5252";
            return (
              <div key={cls.class_id} className="card hover:shadow-md transition-shadow group">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#f1f3f5] flex items-center justify-center text-[#495057] font-bold text-sm">{cls.class_name.split(" ")[0]?.substring(0, 3)}</div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#212529]">{cls.class_name}</h3>
                      <p className="text-[11px] text-[#868e96]">{cls.total_students} students</p>
                    </div>
                  </div>
                  {cls.is_holiday_today && <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Holiday</span>}
                </div>

                {/* Monthly Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                    <span className="text-[#868e96] uppercase tracking-wider">Monthly Avg</span>
                    <span style={{ color: pctColor }}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#f1f3f5] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pctColor }} />
                  </div>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-[#f8f9fa] rounded-lg py-2">
                    <p className="text-lg font-bold text-[#40c057]">{cls.present_today}</p>
                    <p className="text-[10px] text-[#868e96] font-medium">Present</p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-lg py-2">
                    <p className="text-lg font-bold text-[#fa5252]">{cls.marked_today - cls.present_today - (cls.is_holiday_today ? cls.total_students : 0)}</p>
                    <p className="text-[10px] text-[#868e96] font-medium">Absent</p>
                  </div>
                  <div className="bg-[#f8f9fa] rounded-lg py-2">
                    <p className="text-lg font-bold text-[#868e96]">{cls.total_students - cls.marked_today}</p>
                    <p className="text-[10px] text-[#868e96] font-medium">Unmarked</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => openMarkTab(cls.class_id)} className="flex-1 btn-primary text-xs py-2">
                    Mark Attendance
                  </button>
                  <button onClick={() => openRegisterTab(cls.class_id)} className="flex-1 btn-secondary text-xs py-2">
                    Full Register
                  </button>
                </div>
              </div>
            );
          })}
          {overview.length === 0 && (
            <div className="col-span-full card text-center py-16 text-[#868e96]">Loading class data...</div>
          )}
        </div>
      )}

      {/* ═══════ TAB 2: MARK ATTENDANCE ═══════ */}
      {tab === "mark" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
          {/* Toolbar */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Class</label>
                <select className="select-field" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); fetchAttendance(e.target.value); }}>
                  <option value="">-- Choose --</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" className="input-field" value={selectedDate} max={new Date().toISOString().split("T")[0]} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              {isTeacher && selectedClassId && classStudents.length > 0 && (
                <div className="flex gap-2 sm:ml-auto">
                  <button onClick={() => handleBulkAction("present")} disabled={saving} className="btn-primary py-2.5 px-4 text-xs">
                    {saving ? "Saving..." : "✓ Mark All Present"}
                  </button>
                  <button onClick={() => handleBulkAction("holiday")} disabled={saving} className="py-2.5 px-4 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">
                    🏖️ Mark as Holiday
                  </button>
                  <button
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await fetchAttendance(selectedClassId);
                        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Attendance saved successfully!", type: 'success' } }));
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="py-2.5 px-5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Student Grid */}
          {!selectedClassId ? (
            <div className="card text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f8f9fa] mb-4">
                <svg className="w-8 h-8 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>
              </div>
              <h3 className="text-[#495057] font-semibold text-base mb-1">No Class Selected</h3>
              <p className="text-sm text-[#868e96]">Select a class to begin marking attendance.</p>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="card text-center py-20 text-[#868e96]">No students in this class.</div>
          ) : (
            <div className="card overflow-hidden p-0 border border-[#e9ecef]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[11px] uppercase tracking-wider text-[#868e96] font-bold">
                    <tr>
                      <th className="px-5 py-4 w-12">#</th>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f5]">
                    {classStudents.map((student, index) => {
                      const record = currentDayMap[student.id];
                      const isHoliday = record?.status?.toLowerCase() === "holiday";
                      return (
                        <tr key={student.id} className="hover:bg-[#f8f9fa] transition-colors">
                          <td className="px-5 py-3.5 text-[#adb5bd] font-medium">{index + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-[#212529]">{student.first_name} {student.last_name}</div>
                            <div className="text-[11px] text-[#adb5bd] mt-0.5">ID: {student.id}</div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isHoliday ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">🏖️ Holiday</span>
                            ) : record ? (
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${record.status.toLowerCase() === "present" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                {record.status}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#ced4da]">Not marked</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {isHoliday ? (
                              <span className="text-[12px] text-blue-400 italic">Holiday — no action</span>
                            ) : (
                              <div className="flex items-center gap-4">
                                <label className={`flex items-center gap-1.5 cursor-pointer ${!isTeacher && 'opacity-70 cursor-not-allowed'}`}>
                                  <input type="radio" name={`status-${student.id}`} value="present" disabled={!isTeacher} checked={record?.status?.toLowerCase() === 'present'} onChange={() => handleMarkAttendance(student.id, 'present')} className="w-4 h-4 accent-[#40c057]" />
                                  <span className={`text-[13px] font-medium ${record?.status?.toLowerCase() === 'present' ? 'text-[#212529]' : 'text-[#868e96]'}`}>Present</span>
                                </label>
                                <label className={`flex items-center gap-1.5 cursor-pointer ${!isTeacher && 'opacity-70 cursor-not-allowed'}`}>
                                  <input type="radio" name={`status-${student.id}`} value="absent" disabled={!isTeacher} checked={record?.status?.toLowerCase() === 'absent'} onChange={() => handleMarkAttendance(student.id, 'absent')} className="w-4 h-4 accent-[#fa5252]" />
                                  <span className={`text-[13px] font-medium ${record?.status?.toLowerCase() === 'absent' ? 'text-[#212529]' : 'text-[#868e96]'}`}>Absent</span>
                                </label>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB 3: FULL REGISTER (Excel Grid) ═══════ */}
      {tab === "register" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
          {/* Month/Year selector */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-[11px] font-bold text-[#868e96] uppercase tracking-wider mb-1.5">Class</label>
                <select className="select-field" value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); fetchAttendance(e.target.value); }}>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                </select>
              </div>
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
            </div>
          </div>

          {/* Excel Grid */}
          <div className="card overflow-hidden p-0 border border-[#e9ecef]">
            <div className="overflow-x-auto">
              <table className="text-[11px] border-collapse" style={{ minWidth: `${daysInMonth * 36 + 250}px` }}>
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e9ecef]">
                    <th className="sticky left-0 bg-[#f8f9fa] z-10 px-3 py-3 text-left text-[10px] uppercase tracking-wider text-[#868e96] font-bold border-r border-[#e9ecef]" style={{ minWidth: "180px" }}>Student</th>
                    {dayColumns.map(d => (
                      <th key={d} className="px-0 py-3 text-center text-[10px] font-bold text-[#495057] border-r border-[#f1f3f5]" style={{ minWidth: "32px" }}>{d}</th>
                    ))}
                    <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#868e96] font-bold border-l border-[#e9ecef]" style={{ minWidth: "60px" }}>Total</th>
                    <th className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-[#868e96] font-bold" style={{ minWidth: "50px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, idx) => {
                    const studentMap = regMap[student.id] || {};
                    let totalP = 0, totalW = 0;
                    dayColumns.forEach(d => {
                      const st = studentMap[d];
                      if (st) {
                        if (st.toLowerCase() === "present") { totalP++; totalW++; }
                        else if (st.toLowerCase() === "absent") { totalW++; }
                      }
                    });
                    const pct = totalW > 0 ? Math.round((totalP / totalW) * 100) : 0;
                    return (
                      <tr key={student.id} className={`border-b border-[#f1f3f5] ${idx % 2 === 0 ? "" : "bg-[#fafbfc]"}`}>
                        <td className="sticky left-0 bg-white z-10 px-3 py-2 font-semibold text-[#212529] border-r border-[#e9ecef] whitespace-nowrap" style={idx % 2 !== 0 ? { backgroundColor: "#fafbfc" } : {}}>
                          {student.first_name} {student.last_name}
                        </td>
                        {dayColumns.map(d => {
                          const st = studentMap[d];
                          return (
                            <td key={d} className={`px-0 py-2 text-center border-r border-[#f1f3f5] ${cellStyle(st)}`}>
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
                    <td className="px-2 py-2.5 text-center border-l border-[#e9ecef]" />
                    <td className="px-2 py-2.5 text-center" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-[11px] font-semibold text-[#868e96] px-1">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" /> P = Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300" /> A = Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" /> H = Holiday</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#f1f3f5] border border-[#dee2e6]" /> — = No Data</span>
          </div>
        </div>
      )}
    </div>
  );
}
