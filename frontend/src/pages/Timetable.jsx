import { useState, useEffect, useMemo, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const addMinutes = (timeStr, mins) => {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + mins);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

export default function Timetable() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isTeacher = user?.role === "teacher";

  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [settings, setSettings] = useState({
    days_per_week: 6,
    periods_per_day: 6,
    start_time: "08:45",
    period_duration_minutes: 60,
    lunch_after_period: 4,
    lunch_duration_minutes: 45,
    short_break_after_period: 2,
    short_break_duration_minutes: 15,
  });
  const [grids, setGrids] = useState(null);
  const [viewingClassId, setViewingClassId] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clRes, stRes] = await Promise.all([api.get("/classes"), api.get("/staff")]);
        setClasses(clRes.data); setStaff(stRes.data);
      } catch {}
    };
    fetchData();
  }, []);

  // Fetch teacher's personal timetable
  useEffect(() => {
    if (isTeacher && user?.staff_id) {
      setTeacherLoading(true);
      api.get(`/timetable/teacher/${user.staff_id}`)
        .then(res => setTeacherData(res.data))
        .catch(() => setTeacherData(null))
        .finally(() => setTeacherLoading(false));
    }
  }, [isTeacher, user?.staff_id]);

  const toggleClassSelection = (classId) => setSelectedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  const handleAddSubject = () => setAllocations([...allocations, { subject: "", teacher_id: "", teacher_name: "", periods_per_week: 6 }]);
  const updateAllocation = (index, field, value) => {
    const newAlloc = [...allocations];
    newAlloc[index][field] = value;
    if (field === "teacher_id") {
      const teacher = staff.find(s => s.id === Number(value));
      newAlloc[index].teacher_name = teacher ? `${teacher.first_name} ${teacher.last_name}` : "";
      newAlloc[index].teacher_id = Number(value);
    }
    setAllocations(newAlloc);
  };
  const removeAllocation = (index) => setAllocations(allocations.filter((_, i) => i !== index));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payloadAllocations = [];
      for (const classId of selectedClasses) {
        for (const alloc of allocations) payloadAllocations.push({ ...alloc, class_id: classId });
      }
      const payload = { class_ids: selectedClasses, allocations: payloadAllocations, settings };
      const res = await api.post("/timetable/generate", payload);
      setGrids(res.data.grids);
      if (selectedClasses.length > 0) setViewingClassId(selectedClasses[0]);
    } catch (err) {
      alert("Failed to generate timetable.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      for (const classId of selectedClasses) {
        const classInfo = classes.find(c => c.id === classId);
        await api.post("/timetable/", {
          class_id: classId, name: `${classInfo.name} ${classInfo.section} Timetable`, year: "2025-2026", settings, grid: grids[classId]
        });
      }
      alert("Timetable saved successfully!");
    } catch { alert("Failed to save."); }
  };

  const handleFetchTimetable = async (cid) => {
    if (!cid) return;
    try {
      const res = await api.get(`/timetable/class/${cid}`);
      setSettings(res.data.settings); setSelectedClasses([Number(cid)]); setViewingClassId(Number(cid)); setGrids({ [Number(cid)]: res.data.grid });
    } catch { alert("No saved timetable found for this class. Generate a new one below."); }
  };

  const selectBatch = (gradeStart, gradeEnd) => {
    const batchClasses = classes.filter(c => {
      const nameStr = String(c.name).toLowerCase();
      let grade = -1;
      const match = nameStr.match(/(\d+)/);
      if (match) grade = parseInt(match[0]);
      else {
        const words = nameStr.split(/[\s-]/);
        if (words.includes("one") || words.includes("i") || nameStr === "i") grade = 1;
        else if (words.includes("two") || words.includes("ii") || nameStr === "ii") grade = 2;
        else if (words.includes("three") || words.includes("iii") || nameStr === "iii") grade = 3;
        else if (words.includes("four") || words.includes("iv") || nameStr === "iv") grade = 4;
        else if (words.includes("five") || words.includes("v") || nameStr === "v") grade = 5;
        else if (words.includes("six") || words.includes("vi") || nameStr === "vi") grade = 6;
        else if (words.includes("seven") || words.includes("vii") || nameStr === "vii") grade = 7;
        else if (words.includes("eight") || words.includes("viii") || nameStr === "viii") grade = 8;
        else if (words.includes("nine") || words.includes("ix") || nameStr === "ix") grade = 9;
        else if (words.includes("ten") || words.includes("x") || nameStr === "x") grade = 10;
      }
      return grade >= gradeStart && grade <= gradeEnd;
    }).map(c => c.id);
    setSelectedClasses(batchClasses);
  };

  const subjectColors = [
    "bg-[#edf2ff] text-[#4263eb]", "bg-[#f3f0ff] text-[#7048e8]", "bg-[#e3fafc] text-[#1098ad]",
    "bg-[#ebfbee] text-[#2b8a3e]", "bg-[#fff3bf] text-[#f59f00]", "bg-[#ffe3e3] text-[#e03131]",
  ];
  const subjectColorMap = useRef({});
  const colorIdx = useRef(0);
  const getSubjectColor = (subject) => {
    if (!subject) return "";
    if (!subjectColorMap.current[subject]) {
      subjectColorMap.current[subject] = subjectColors[colorIdx.current % subjectColors.length];
      colorIdx.current++;
    }
    return subjectColorMap.current[subject];
  };

  const handleDownloadPDF = async (elementId, filename) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Add a slight delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(filename);
    } catch (error) {
      console.error("Could not generate PDF", error);
      alert("Failed to generate PDF.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="animate-slide-up">
        <h1 className="page-title">Timetable Generator</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Create conflict-free schedules for your school batches.</p>
      </div>

      {!grids && (
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up mb-6 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-[#212529]">View Saved Timetable</h3>
            <p className="text-xs text-[#868e96] mt-0.5">Select a class to instantly view its stored active timetable.</p>
          </div>
          <select className="select-field max-w-xs" onChange={e => { handleFetchTimetable(e.target.value); e.target.value = ""; }} defaultValue="">
            <option value="" disabled>-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
        </div>
      )}

      {!grids ? (
        isAdmin ? (
          <div className="space-y-6 animate-slide-up">
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#212529] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-sm font-semibold text-[#212529]">Schedule Settings</h3>
                <p className="text-xs text-[#868e96]">Configure period timings and break durations.</p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Periods per Day</label><input type="number" className="input-field" value={settings.periods_per_day} onChange={e => setSettings({...settings, periods_per_day: Number(e.target.value)})} /></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Start Time</label><input type="time" className="input-field" value={settings.start_time} onChange={e => setSettings({...settings, start_time: e.target.value})} /></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Period Duration</label><div className="relative"><input type="number" className="input-field pr-12" value={settings.period_duration_minutes} onChange={e => setSettings({...settings, period_duration_minutes: Number(e.target.value)})} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#868e96]">mins</span></div></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Days per Week</label><select className="select-field" value={settings.days_per_week} onChange={e => setSettings({...settings, days_per_week: Number(e.target.value)})}>{[5,6].map(n => <option key={n} value={n}>{n} Days</option>)}</select></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-4 pt-4 border-t border-[#f1f3f5]">
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Short Break After</label><select className="select-field" value={settings.short_break_after_period} onChange={e => setSettings({...settings, short_break_after_period: Number(e.target.value)})}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>Period {n}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Short Break Duration</label><div className="relative"><input type="number" className="input-field pr-12" value={settings.short_break_duration_minutes} onChange={e => setSettings({...settings, short_break_duration_minutes: Number(e.target.value)})} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#868e96]">mins</span></div></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Lunch After</label><select className="select-field" value={settings.lunch_after_period} onChange={e => setSettings({...settings, lunch_after_period: Number(e.target.value)})}>{[2,3,4,5,6].map(n => <option key={n} value={n}>Period {n}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-[#495057] mb-1.5">Lunch Duration</label><div className="relative"><input type="number" className="input-field pr-12" value={settings.lunch_duration_minutes} onChange={e => setSettings({...settings, lunch_duration_minutes: Number(e.target.value)})} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#868e96]">mins</span></div></div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#212529] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#212529]">Select Batch Classes</h3>
                <p className="text-xs text-[#868e96]">Choose predefined batch or individual classes.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => selectBatch(1, 5)} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#edf2ff] text-[#4263eb] hover:bg-[#e5edff]">Batch 1 (1-5)</button>
                <button type="button" onClick={() => selectBatch(6, 10)} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#edf2ff] text-[#4263eb] hover:bg-[#e5edff]">Batch 2 (6-10)</button>
                <button type="button" onClick={() => setSelectedClasses([])} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-[#868e96] hover:bg-[#f8f9fa]">Clear</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f1f3f5]">
              {classes.map(c => (
                <button key={c.id} type="button" onClick={() => toggleClassSelection(c.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${selectedClasses.includes(c.id) ? 'bg-[#212529] border-[#212529] text-white shadow-md' : 'bg-white border-[#e9ecef] text-[#495057] hover:border-[#ced4da]'}`}>
                  {selectedClasses.includes(c.id) && <svg className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  {c.name} {c.section}
                </button>
              ))}
            </div>
          </div>

          {selectedClasses.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#212529] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#212529]">Batch Subject Mapping</h3>
                  <p className="text-xs text-[#868e96]">These subjects apply to all selected classes.</p>
                </div>
                <button onClick={handleAddSubject} className="btn-primary text-xs py-1.5 px-3">Add Subject</button>
              </div>

              <div className="rounded-xl border border-[#e9ecef] overflow-hidden">
                <div className="flex bg-[#f8f9fa] border-b border-[#e9ecef] px-4 py-3 text-[10px] font-bold text-[#868e96] uppercase tracking-wider">
                  <div className="flex-1">Subject Name</div>
                  <div className="flex-1 ml-3">Assigned Teacher</div>
                  <div className="w-28 ml-3 text-center">Periods/Wk</div>
                  <div className="w-8 ml-3"></div>
                </div>
                <div className="p-4 space-y-3">
                  {allocations.map((alloc, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input placeholder="e.g. Mathematics" value={alloc.subject} onChange={e => updateAllocation(idx, 'subject', e.target.value)} className="input-field flex-1 text-sm" />
                      <select value={alloc.teacher_id} onChange={e => updateAllocation(idx, 'teacher_id', e.target.value)} className="select-field flex-1 text-sm">
                        <option value="">Assign teacher…</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                      </select>
                      <input type="number" min="1" max="10" value={alloc.periods_per_week} onChange={e => updateAllocation(idx, 'periods_per_week', Number(e.target.value))} className="input-field text-sm w-28 text-center" />
                      <button onClick={() => removeAllocation(idx)} className="text-[#adb5bd] hover:text-red-500 transition-colors p-1"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button onClick={handleGenerate} disabled={generating || selectedClasses.length === 0 || allocations.length === 0} className="btn-primary w-full py-3.5 text-[15px] shadow-sm disabled:opacity-50">
            {generating ? "Generating..." : "Generate Timetables"}
          </button>
        </div>
        ) : isTeacher ? (
          /* ═══════ TEACHER PERSONAL TIMETABLE ═══════ */
          teacherLoading ? (
            <div className="card text-center py-20 animate-slide-up"><p className="text-[#868e96]">Loading your timetable...</p></div>
          ) : teacherData ? (
            <div className="space-y-6 animate-slide-up">
              <div className="card flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#212529]">My Teaching Schedule</h2>
                  <p className="text-xs text-[#868e96] mt-0.5">Personal timetable for <span className="font-semibold text-[#4263eb]">{teacherData.teacher_name}</span>. Auto-synced with class schedules.</p>
                </div>
                <button onClick={() => handleDownloadPDF("teacher-timetable-pdf", `Timetable_${teacherData.teacher_name.replace(/\s+/g, '_')}.pdf`)} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Export PDF
                </button>
              </div>

              <div className="card overflow-x-auto p-0" id="teacher-timetable-pdf" style={{ padding: "20px" }}>
                <table className="w-full border-collapse text-sm" style={{ minWidth: "800px" }}>
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-4 text-[11px] font-bold text-[#868e96] uppercase tracking-wider border-b border-[#e9ecef] w-28 bg-[#f8f9fa]">Day</th>
                      {Array.from({ length: teacherData.settings.periods_per_day }).map((_, i) => (
                        <th key={i} className="py-3 px-2 text-[11px] font-bold text-[#868e96] uppercase tracking-wider border-b border-[#e9ecef] bg-[#f8f9fa]">
                          <div>Period {i + 1}</div>
                          <div className="font-normal text-[10px] mt-0.5 opacity-70">{addMinutes(teacherData.settings.start_time || "08:45", i * (teacherData.settings.period_duration_minutes || 60))}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].slice(0, teacherData.settings.days_per_week || 6).map((dayName, dayIndex) => (
                      <tr key={dayIndex} className="border-b border-[#f1f3f5] hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-2 px-4 font-bold text-[#212529] text-[13px]">{dayName}</td>
                        {teacherData.grid[dayIndex]?.map((cell, periodIndex) => (
                          <td key={periodIndex} className="py-2 px-1.5">
                            {cell ? (
                              <div className={`rounded-lg px-2.5 py-2 text-center ${getSubjectColor(cell.subject)}`}>
                                <div className="font-bold text-[11px] leading-tight uppercase tracking-wide">{cell.subject}</div>
                                <div className="text-[10px] mt-1 font-semibold opacity-80">{cell.class_name}</div>
                              </div>
                            ) : (
                              <div className="rounded-lg px-2 py-2 text-center bg-emerald-50 text-emerald-600 text-[10px] font-semibold">FREE</div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card text-center py-20 animate-slide-up border-dashed">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-bold text-[#212529] mb-2">No Timetable Available</h3>
              <p className="text-[13px] text-[#868e96] max-w-md mx-auto">Your timetable will appear here once the administrator generates and saves class schedules.</p>
            </div>
          )
        ) : (
          <div className="card text-center py-20 animate-slide-up border-dashed">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-[#212529] mb-2">View Class Timetables</h3>
            <p className="text-[13px] text-[#868e96] max-w-md mx-auto">Select a class from the dropdown above to view its timetable.</p>
          </div>
        )
      ) : (
        <div className="animate-slide-up space-y-6">
          <div className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {selectedClasses.map(cid => {
                const c = classes.find(x => x.id === cid);
                return <button key={cid} onClick={() => setViewingClassId(cid)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewingClassId === cid ? 'bg-[#212529] text-white shadow-md' : 'bg-[#f1f3f5] text-[#495057] hover:bg-[#e9ecef]'}`}>{c.name} {c.section}</button>;
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGrids(null)} className="btn-secondary text-xs py-1.5">Close</button>
              {isAdmin && <button onClick={handleSave} className="btn-primary text-xs py-1.5">Save</button>}
              <button onClick={() => {
                const c = classes.find(x => x.id === viewingClassId);
                handleDownloadPDF("class-timetable-pdf", `Timetable_${c ? c.name.replace(/\s+/g, '_') : 'Class'}.pdf`);
              }} className="btn-primary text-xs py-1.5 bg-[#495057] border-[#495057] hover:bg-[#343a40] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Export PDF
              </button>
            </div>
          </div>

          <div className="card overflow-x-auto print:hidden" id="class-timetable-pdf" style={{ padding: "20px" }}>
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-[11px] font-bold text-[#868e96] uppercase tracking-wider border-b border-[#e9ecef] w-28 bg-[#f8f9fa] rounded-tl-lg">Day</th>
                  {Array.from({length: settings.periods_per_day}).map((_, i) => (
                    <th key={i} className="py-3 px-2 text-[11px] font-bold text-[#868e96] uppercase tracking-wider border-b border-[#e9ecef] bg-[#f8f9fa]">
                      <div>Period {i+1}</div>
                      <div className="font-normal text-[10px] mt-0.5 opacity-70">{addMinutes(settings.start_time, i * settings.period_duration_minutes)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].slice(0, settings.days_per_week).map((dayName, dayIndex) => (
                  <tr key={dayIndex} className="border-b border-[#f1f3f5] hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-2 px-4 font-bold text-[#212529] text-[13px]">{dayName}</td>
                    {grids[viewingClassId] && grids[viewingClassId][dayIndex].map((cell, periodIndex) => (
                      <td key={periodIndex} className="py-2 px-1.5">
                        {cell ? (
                          <div className={`rounded-lg px-2.5 py-2 text-center ${getSubjectColor(cell.subject)}`}>
                            <div className="font-bold text-[11px] leading-tight uppercase tracking-wide">{cell.subject}</div>
                            <div className="text-[10px] mt-1 font-semibold opacity-80">{cell.teacher}</div>
                          </div>
                        ) : (
                          <div className="rounded-lg px-2 py-2 text-center bg-[#f8f9fa] text-[#adb5bd] text-xs">—</div>
                        )}
                      </td>
                    ))}
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
