import { useEffect, useMemo, useState, useRef } from "react";
import api from "../api/axios";
import CountUp from "../components/CountUp";
import Pagination from "../components/Pagination.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { generateStudentIdCards } from "../utils/idCardGenerator.js";
import ImageCropper from "../components/ImageCropper.jsx";
import AdmissionLetter from "../components/AdmissionLetter.jsx";
import useAutoSave from "../hooks/useAutoSave.js";
import { formatDate } from "../utils/dateFormatter.js";
import { sanitizeName, sanitizeDigits, sanitizeEmail, sanitizeText } from "../utils/inputSanitizer.js";
import HallTicketModal from "../components/HallTicketModal.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const emptyForm = {
  first_name: "", last_name: "", dob: "", gender: "", email: "", phone: "", address: "", admission_date: "", class_id: "",
  religion: "", blood_group: "", nationality: "",
  father_name: "", mother_name: "", parent_contact: "", parent_occupation: "",
  transport_route_id: "", pickup_point: "",
  base_fee: 0, discount_amount: 0, discount_reason: "", transport_fee: 0, other_fee: 0, total_fee: 0, discount_percentage: 0,
};

const GRADE_FEES = {
  1: { tuition: 40000, other: 8000 },
  2: { tuition: 42000, other: 8500 },
  3: { tuition: 44000, other: 9000 },
  4: { tuition: 46000, other: 9000 },
  5: { tuition: 48000, other: 9500 },
  6: { tuition: 52000, other: 10000 },
  7: { tuition: 56000, other: 10500 },
  8: { tuition: 60000, other: 11000 },
  9: { tuition: 65000, other: 11500 },
  10: { tuition: 70000, other: 12000 },
};

const GRADE_AGE_LIMITS = {
  1: { min: 5, max: 7 },
  2: { min: 6, max: 8 },
  3: { min: 7, max: 9 },
  4: { min: 8, max: 10 },
  5: { min: 9, max: 11 },
  6: { min: 10, max: 12 },
  7: { min: 11, max: 13 },
  8: { min: 12, max: 14 },
  9: { min: 13, max: 15 },
  10: { min: 14, max: 16 },
};

const calculateAge = (dob) => {
  const birth = new Date(`${dob}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const extractGradeNumber = (className) => {
  const match = className?.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) return num;
  }
  return null;
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [form, setForm, clearForm] = useAutoSave("student_form_draft", emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const pageSize = 15;

  const [activeTab, setActiveTab] = useState("directory");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [admissionSuccess, setAdmissionSuccess] = useState(null);
  const letterRef = useRef(null);
  const [passedOut, setPassedOut] = useState([]);
  const [poSearch, setPoSearch] = useState("");
  const [poPage, setPoPage] = useState(1);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [showHallTicket, setShowHallTicket] = useState(null); // stores the student object

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes, routesRes] = await Promise.all([
        api.get("/students"), 
        api.get("/classes"),
        api.get("/transport")
      ]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
      setRoutes(routesRes.data);
    } catch(err) {
      console.error(err);
    }
  };
  const fetchPassedOut = async () => {
    try { const res = await api.get("/students/passed-out"); setPassedOut(res.data); } catch(e) { console.error(e); }
  };
  useEffect(() => {
    fetchData(); fetchPassedOut();
    api.get("/admin/school-settings").then(r => setSchoolSettings(r.data)).catch(() => {});
  }, []);

  const classMap = useMemo(() => {
    const map = {};
    classes.forEach((cls) => { map[cls.id] = `${cls.name} ${cls.section}`; });
    return map;
  }, [classes]);

  const routeMap = useMemo(() => {
    const map = {};
    routes.forEach((r) => { map[r.id] = `${r.route_number} (${r.vehicle_number})`; });
    return map;
  }, [routes]);

  const admissionYears = useMemo(() => {
    const years = new Set();
    students.forEach((s) => { if (s.admission_date) { const y = String(s.admission_date).substring(0, 4); if (y && y.length === 4) years.add(y); } });
    return Array.from(years).sort((a, b) => b - a);
  }, [students]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return students.filter((student) => {
      if (filterClass && String(student.class_id) !== filterClass) return false;
      if (filterYear) { const admYear = String(student.admission_date || "").substring(0, 4); if (admYear !== filterYear) return false; }
      if (term) {
        const className = classMap[student.class_id] || "";
        const searchable = [String(student.id || ""), student.first_name, student.last_name, student.email || "", student.phone || "", student.gender || "", student.address || "", student.dob || "", student.admission_date || "", className].join(" ").toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [students, search, filterClass, filterYear, classMap]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'name') {
        aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
        bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  useEffect(() => { setPage(1); }, [search, filterClass, filterYear, sortConfig]);
  const totalPages = Math.max(1, Math.ceil(sortedAndFiltered.length / pageSize));
  const paged = sortedAndFiltered.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => { clearForm(); setEditingId(null); setIsEditing(false); };

  useEffect(() => {
    if (activeTab === "profile" && !editingId && !selectedStudent) {
      const today = new Date().toISOString().split("T")[0];
      setForm(f => (f.admission_date ? f : { ...f, admission_date: today }));
    }
  }, [activeTab, editingId, selectedStudent]);

  // Auto-calculate Total Fee
  useEffect(() => {
    if (isEditing || (!editingId && activeTab === "profile")) {
      const b = parseFloat(form.base_fee) || 0;
      const d = parseFloat(form.discount_amount) || 0;
      const t = parseFloat(form.transport_fee) || 0;
      const o = parseFloat(form.other_fee) || 0;
      const total = b - d + t + o;
      if (form.total_fee !== total) {
        setForm(f => ({ ...f, total_fee: total }));
      }
    }
  }, [form.base_fee, form.discount_amount, form.transport_fee, form.other_fee, activeTab, isEditing, editingId]);

  const handleClassChange = (e) => {
    const classId = e.target.value;
    const selectedClass = classes.find(c => String(c.id) === classId);
    
    let base_fee = form.base_fee;
    let other_fee = form.other_fee;
    let discount_amount = form.discount_amount;
    
    if (selectedClass && !editingId) { // Auto-populate for NEW admissions
      const grade = extractGradeNumber(selectedClass.name);
      if (grade && GRADE_FEES[grade]) {
        base_fee = GRADE_FEES[grade].tuition;
        other_fee = GRADE_FEES[grade].other;
        discount_amount = (base_fee * (form.discount_percentage || 0)) / 100;
      }
    }
    
    setForm({ ...form, class_id: classId, base_fee, other_fee, discount_amount });
  };

  const handleDiscountChange = (e) => {
    const percentage = parseInt(e.target.value, 10) || 0;
    const amount = (form.base_fee * percentage) / 100;
    setForm({ ...form, discount_percentage: percentage, discount_amount: amount });
  };

  const handleRouteChange = (e) => {
    const routeId = e.target.value;
    const selectedRoute = routes.find(r => String(r.id) === routeId);
    setForm({
      ...form,
      transport_route_id: routeId,
      transport_fee: selectedRoute ? selectedRoute.monthly_fee : 0
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      // DOB Minimum Age Validation
      if (form.dob && form.class_id) {
        const selectedClass = classes.find(c => String(c.id) === String(form.class_id));
        const grade = selectedClass ? extractGradeNumber(selectedClass.name) : null;
        if (grade && GRADE_AGE_LIMITS[grade]) {
          const age = calculateAge(form.dob);
          const { min } = GRADE_AGE_LIMITS[grade];
          if (age < min) {
            alert(`Student must be at least ${min} years old for Grade ${grade}. Current age: ${age}.`);
            return;
          }
        }
      }

      const payload = { 
        ...form, 
        class_id: Number(form.class_id),
        transport_route_id: form.transport_route_id ? Number(form.transport_route_id) : null
      };
      
      // Convert empty strings to null for optional strings
      ["pickup_point", "discount_reason"].forEach(k => {
        if (payload[k] === "") payload[k] = null;
      });

      let res;
      if (editingId) {
        res = await api.put(`/students/${editingId}`, payload);
      } else {
        res = await api.post("/students", payload);
      }
      const wasNew = !editingId;
      resetForm();
      
      if (res?.offline) {
        setActiveTab("directory");
        return;
      }
      
      await fetchData();
      if (wasNew && res?.data) {
        // Show admission success modal for new students
        setAdmissionSuccess(res.data);
      } else if (editingId && selectedStudent) {
        const updated = (await api.get("/students")).data.find(s => s.id === editingId);
        setSelectedStudent(updated);
      } else {
        setActiveTab("directory");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save student data. Please check your inputs.");
    }
  };

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setActiveTab("profile");
    setIsEditing(false);
    resetForm();
  };

  const handleEditFromProfile = () => {
    setEditingId(selectedStudent.id);
    const percentage = selectedStudent.base_fee ? Math.round((selectedStudent.discount_amount / selectedStudent.base_fee) * 100) : 0;
    setForm({
      first_name: selectedStudent.first_name, last_name: selectedStudent.last_name, dob: selectedStudent.dob,
      gender: selectedStudent.gender, email: selectedStudent.email || "", phone: selectedStudent.phone || "",
      address: selectedStudent.address || "", admission_date: selectedStudent.admission_date, class_id: String(selectedStudent.class_id),
      religion: selectedStudent.religion || "", blood_group: selectedStudent.blood_group || "", nationality: selectedStudent.nationality || "",
      father_name: selectedStudent.father_name || "", mother_name: selectedStudent.mother_name || "", parent_contact: selectedStudent.parent_contact || "", parent_occupation: selectedStudent.parent_occupation || "",
      transport_route_id: selectedStudent.transport_route_id ? String(selectedStudent.transport_route_id) : "", pickup_point: selectedStudent.pickup_point || "",
      base_fee: selectedStudent.base_fee || 0, discount_amount: selectedStudent.discount_amount || 0, discount_reason: selectedStudent.discount_reason || "",
      transport_fee: selectedStudent.transport_fee || 0, other_fee: selectedStudent.other_fee || 0, total_fee: selectedStudent.total_fee || 0,
      discount_percentage: [5, 10].includes(percentage) ? percentage : 0,
    });
    setIsEditing(true);
  };

  const handleDeleteFromProfile = async () => {
    if (!confirm("Delete this student?")) return;
    await api.delete(`/students/${selectedStudent.id}`);
    await fetchData();
    setSelectedStudent(null);
    setActiveTab("directory");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropperSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (blob) => {
    setCropperSrc(null);
    if (!selectedStudent) return;
    
    // Optimistic UI update: show local blob immediately
    const tempUrl = URL.createObjectURL(blob);
    setSelectedStudent(prev => ({ ...prev, photo_url: tempUrl }));

    const formData = new FormData();
    formData.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    try {
      const res = await api.post(`/students/${selectedStudent.id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      // Append timestamp to bypass browser cache for the newly uploaded image
      const finalUrl = `${res.data.photo_url}?t=${new Date().getTime()}`;
      setSelectedStudent(prev => ({ ...prev, photo_url: finalUrl }));
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, photo_url: finalUrl } : s));
    } catch (err) { 
      alert("Photo upload failed."); 
      await fetchData();
    }
  };

  const handleAddNew = () => {
    setSelectedStudent(null);
    setEditingId(null);
    setIsEditing(false);
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...emptyForm, admission_date: today });
    setActiveTab("profile");
  };

  const clearFilters = () => { setSearch(""); setFilterClass(""); setFilterYear(""); };
  const hasActiveFilters = search || filterClass || filterYear;

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "class_id", label: "Class", render: (row) => (<span className="pill pill-info">{classMap[row.class_id] || row.class_id}</span>) },
    { key: "date_of_birth", label: "Date of Birth", render: (row) => formatDate(row.date_of_birth) },
    { key: "admission_date", label: "Admission Date", render: (row) => formatDate(row.admission_date) },
    { key: "parent_contact", label: "Parent Contact", render: (row) => row.parent_contact || "—" },
    { key: "transport_route_id", label: "Transport", render: (row) => row.transport_route_id ? routeMap[row.transport_route_id] || row.transport_route_id : "—" },
    { key: "actions", label: "", render: (row) => (
      <div className="flex items-center gap-3">
        <button className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] transition-colors" onClick={() => handleViewProfile(row)}>View Profile</button>
        <button className="text-[13px] font-semibold text-[#059669] hover:text-[#047857] transition-colors" onClick={() => setShowHallTicket(row)}>Hall Ticket</button>
      </div>
    )},
  ];

  const getAvatarUrl = (person) => {
    if (person?.photo_url) {
      if (person.photo_url.startsWith("blob:")) return person.photo_url;
      return `${API_BASE}${person.photo_url}`;
    }
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((person?.first_name || "U") + " " + (person?.last_name || ""))}&backgroundColor=212529&textColor=ffffff&fontSize=40`;
  };

  const DetailItem = ({ label, value, icon }) => (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--color-border-light, #f1f3f5)" }}>
      <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center text-[#868e96] flex-shrink-0 mt-0.5">
        <span className="text-xs">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#adb5bd]">{label}</p>
        <p className="text-[13px] font-medium text-[#212529] mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">Manage student records, demographics, and transport.</p>
        </div>
        {activeTab === "directory" && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => generateStudentIdCards(sortedAndFiltered)} className="btn-secondary text-xs py-1.5 px-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
              Generate IDs
            </button>
            <button type="button" onClick={handleAddNew} className="btn-primary text-xs py-1.5 px-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add new
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-0 border-b animate-slide-up" style={{ borderColor: "var(--color-border)", animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <button type="button" onClick={() => { setActiveTab("directory"); resetForm(); }}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "directory" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Directory
        </button>
        <button type="button" onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "profile" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          {isEditing ? "Edit Profile" : editingId ? "Student Profile" : "Admit Student"}
        </button>
        <button type="button" onClick={() => { setActiveTab("passedout"); fetchPassedOut(); }}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "passedout" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Passed Out
        </button>
      </div>

      {/* ═══════ TAB 1: DIRECTORY ═══════ */}
      {activeTab === "directory" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          {/* Stat cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Students", value: students.length },
              { label: "Male", value: students.filter(s => (s.gender || "").toLowerCase() === "male").length },
              { label: "Female", value: students.filter(s => (s.gender || "").toLowerCase() === "female").length },
              { label: "Using Transport", value: students.filter(s => s.transport_route_id != null).length },
            ].map((stat, idx) => (
              <div key={stat.label} className="card !py-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f3f5] flex-shrink-0">
                  <svg className="w-5 h-5 text-[#495057]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-[#212529]">
                    <CountUp end={stat.value} duration={1200} />
                  </p>
                  <p className="text-[11px] text-[#868e96] font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filter bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex items-center rounded-lg border bg-white overflow-hidden flex-1 max-w-md" style={{ borderColor: "var(--color-border)" }}>
              <div className="pointer-events-none flex items-center pl-3.5">
                <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <select className="select-field text-xs py-1.5 w-auto" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map((cls) => <option key={cls.id} value={String(cls.id)}>{cls.name} {cls.section}</option>)}
              </select>
              <select className="select-field text-xs py-1.5 w-auto" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {admissionYears.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
              </select>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="flex items-center justify-center h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Clear filters">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{filtered.length} records</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => {
                if (!filterClass) {
                  alert("Please select a class first to generate bulk hall tickets.");
                  return;
                }
                setShowHallTicket({ isBulk: true, targetClassId: filterClass, students: filtered });
              }} 
              className="btn-secondary text-xs py-1.5 flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
              Bulk Hall Ticket
            </button>
            <ImportExportToolbar data={filtered} columns={columns} filename="Students_Export" templateFields={Object.keys(emptyForm)} importEndpoint="/students/import" onImportSuccess={fetchData} />
          </div>

          <Table columns={columns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={filtered.length} pageSize={pageSize} />
        </div>
      )}

      {/* ═══════ TAB 2: PROFILE / FORM ═══════ */}
      {activeTab === "profile" && (
        <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          {selectedStudent && !isEditing ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Avatar Card */}
              <div className="card flex flex-col items-center text-center py-8">
                <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                  <img src={getAvatarUrl(selectedStudent)} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#f1f3f5]" style={{ boxShadow: "0 2px 8px -2px rgb(0 0 0 / 0.1)" }} />
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
                <h2 className="text-lg font-heading font-bold text-[#212529]">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <p className="text-[13px] text-[#868e96] mt-0.5">Student ID: <span className="font-mono font-bold text-[#4263eb]">#{selectedStudent.id}</span></p>
                <span className="mt-2 pill pill-active">{classMap[selectedStudent.class_id] || "Unassigned"}</span>
                <div className="mt-5 flex flex-wrap gap-2 w-full px-4">
                  <button onClick={handleEditFromProfile} className="btn-primary text-xs flex-1 py-2">Edit Profile</button>
                  <button onClick={() => setShowHallTicket(selectedStudent)} className="btn-secondary text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-1 py-2">Hall Ticket</button>
                  <button onClick={() => {
                    const letterHtml = letterRef.current?.innerHTML || "";
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'absolute';
                    iframe.style.width = '0px';
                    iframe.style.height = '0px';
                    iframe.style.border = 'none';
                    document.body.appendChild(iframe);
                    
                    const doc = iframe.contentWindow.document;
                    doc.open();
                    doc.write(`<!DOCTYPE html><html><head><title>Admission Letter – ${selectedStudent.first_name} ${selectedStudent.last_name}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${letterHtml}</body></html>`);
                    doc.close();
                    
                    setTimeout(() => { 
                      iframe.contentWindow.focus(); 
                      iframe.contentWindow.print(); 
                      setTimeout(() => {
                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                      }, 1000);
                    }, 400);
                  }} className="btn-secondary text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex-1 py-2" title="Print Admission Letter">
                    Print Admission
                  </button>
                  <button onClick={handleDeleteFromProfile} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50 flex-1 py-2">Delete</button>
                </div>
                <button onClick={() => { setActiveTab("directory"); resetForm(); setSelectedStudent(null); }} className="mt-3 text-xs text-[#868e96] hover:text-[#495057] transition-colors">← Back to Directory</button>
              </div>

              {/* Right: Details */}
              <div className="lg:col-span-2 space-y-5">
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#212529] mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DetailItem label="Date of Birth" value={formatDate(selectedStudent.dob)} icon="🎂" />
                    <DetailItem label="Gender" value={selectedStudent.gender} icon="👤" />
                    <DetailItem label="Blood Group" value={selectedStudent.blood_group} icon="🩸" />
                    <DetailItem label="Religion" value={selectedStudent.religion} icon="🙏" />
                    <DetailItem label="Nationality" value={selectedStudent.nationality} icon="🌍" />
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#212529] mb-4">Contact & Parents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DetailItem label="Address" value={selectedStudent.address} icon="📍" />
                    <DetailItem label="Student Phone" value={selectedStudent.phone} icon="📞" />
                    <DetailItem label="Father's Name" value={selectedStudent.father_name} icon="👨" />
                    <DetailItem label="Mother's Name" value={selectedStudent.mother_name} icon="👩" />
                    <DetailItem label="Parent Contact" value={selectedStudent.parent_contact} icon="📱" />
                    <DetailItem label="Parent Occupation" value={selectedStudent.parent_occupation} icon="💼" />
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#212529] mb-4">Transport & Fees</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DetailItem label="Transport Route" value={selectedStudent.transport_route_id ? routeMap[selectedStudent.transport_route_id] : "None"} icon="🚌" />
                    <DetailItem label="Pickup Point" value={selectedStudent.pickup_point} icon="🚏" />
                    <DetailItem label="Total Monthly Fee" value={`₹${selectedStudent.total_fee?.toFixed(2) || '0.00'}`} icon="💰" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── CATEGORIZED ADMIT / EDIT FORM ── */
            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-10">
              
              {/* Section 1: Academic & Personal */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#e7f5ff] text-[#1c7ed6] flex items-center justify-center font-bold text-sm">1</div>
                  <h2 className="text-base font-bold text-[#212529]">Academic & Personal Details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">First Name <span className="text-red-500">*</span></label><input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Last Name <span className="text-red-500">*</span></label><input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Date of Birth <span className="text-red-500">*</span></label>
                    <input type="date" className="input-field" value={form.dob}
                      max={(() => {
                        if (!form.class_id) return new Date().toISOString().split("T")[0];
                        const cls = classes.find(c => String(c.id) === String(form.class_id));
                        const grade = cls ? extractGradeNumber(cls.name) : null;
                        if (grade && GRADE_AGE_LIMITS[grade]) {
                          const d = new Date();
                          d.setFullYear(d.getFullYear() - GRADE_AGE_LIMITS[grade].min);
                          return d.toISOString().split("T")[0];
                        }
                        return new Date().toISOString().split("T")[0];
                      })()}
                      onFocus={(e) => {
                        if (!form.class_id) {
                          e.target.blur();
                          alert("Please select a Class first before choosing Date of Birth.");
                        }
                      }}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                      required
                      disabled={!form.class_id}
                    />
                    {form.class_id && (() => {
                      const cls = classes.find(c => String(c.id) === String(form.class_id));
                      const grade = cls ? extractGradeNumber(cls.name) : null;
                      if (grade && GRADE_AGE_LIMITS[grade]) {
                        return <p className="text-[10px] text-[#868e96] mt-1">Minimum age: {GRADE_AGE_LIMITS[grade].min} years for Grade {grade}</p>;
                      }
                      return null;
                    })()}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Gender <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" value="Male" checked={form.gender === "Male"} onChange={(e) => setForm({ ...form, gender: e.target.value })} required className="w-4 h-4 accent-[#212529]" />
                        <span className="text-sm font-medium text-[#212529]">Male</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="gender" value="Female" checked={form.gender === "Female"} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-4 h-4 accent-[#212529]" />
                        <span className="text-sm font-medium text-[#212529]">Female</span>
                      </label>
                    </div>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Class Assigned <span className="text-red-500">*</span></label>
                    <select className="select-field" value={form.class_id} onChange={handleClassChange} required>
                      <option value="">Select class</option>
                      {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} {cls.section}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Admission Date</label>
                    <div className="input-field flex items-center bg-[#f8f9fa] text-[#495057] cursor-not-allowed border-transparent">
                      {formatDate(form.admission_date)}
                    </div>
                  </div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Religion <span className="text-red-500">*</span></label><input className="input-field" value={form.religion} onChange={(e) => setForm({ ...form, religion: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Blood Group <span className="text-red-500">*</span></label>
                    <select className="select-field" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Nationality <span className="text-red-500">*</span></label><input className="input-field" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" /></div>
                </div>
              </div>

              {/* Section 2: Parent & Contact */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#ebfbee] text-[#2b8a3e] flex items-center justify-center font-bold text-sm">2</div>
                  <h2 className="text-base font-bold text-[#212529]">Parent & Contact Details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Father's Name <span className="text-red-500">*</span></label><input className="input-field" value={form.father_name} onChange={(e) => setForm({ ...form, father_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Mother's Name <span className="text-red-500">*</span></label><input className="input-field" value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Parent Contact <span className="text-red-500">*</span></label><input className="input-field" type="tel" pattern="^[0-9]{10}$" maxLength="10" title="Please enter a valid 10-digit mobile number" placeholder="Primary phone number" value={form.parent_contact} onChange={(e) => setForm({ ...form, parent_contact: sanitizeDigits(e.target.value) })} required /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Parent Occupation <span className="text-red-500">*</span></label><input className="input-field" value={form.parent_occupation} onChange={(e) => setForm({ ...form, parent_occupation: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Student Phone <span className="text-red-500">*</span></label><input className="input-field" type="tel" pattern="^[0-9]{10}$" maxLength="10" title="Please enter a valid 10-digit mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizeDigits(e.target.value) })} required /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Student Email <span className="text-red-500">*</span></label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: sanitizeEmail(e.target.value) })} required maxLength={100} pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Enter a valid email address (e.g. user@example.com)" /></div>
                  <div className="md:col-span-3"><label className="block text-xs font-semibold text-[#495057] mb-1">Residential Address <span className="text-red-500">*</span></label><input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: sanitizeText(e.target.value) })} required minLength={5} maxLength={255} title="5–255 characters" /></div>
                </div>
              </div>

              {/* Section 3: Transport & Logistics */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#fff3bf] text-[#f59f00] flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="text-base font-bold text-[#212529]">Transport Logistics</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Transport Route</label>
                    <select className="select-field" value={form.transport_route_id} onChange={handleRouteChange}>
                      <option value="">None (Self Commute)</option>
                      {routes.map((r) => (<option key={r.id} value={r.id}>{r.route_number} - {r.vehicle_number} (₹{r.monthly_fee}/mo)</option>))}
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Pickup Point</label><input className="input-field" disabled={!form.transport_route_id} placeholder={form.transport_route_id ? "Enter nearest stop" : "N/A"} value={form.pickup_point} onChange={(e) => setForm({ ...form, pickup_point: e.target.value })} /></div>
                </div>
              </div>

              {/* Section 4: Financial Configuration */}
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] text-[#6741d9] flex items-center justify-center font-bold text-sm">4</div>
                  <h2 className="text-base font-bold text-[#212529]">Financial Configuration</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-4 items-end">
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Base Tuition Fee (₹)</label><input type="number" step="0.01" min="0" className="input-field" value={form.base_fee} onChange={(e) => {
                    const newBase = parseFloat(e.target.value) || 0;
                    setForm({ ...form, base_fee: newBase, discount_amount: (newBase * (form.discount_percentage || 0)) / 100 });
                  }} title="Auto-populated but editable" /></div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Discount (%)</label>
                    <select className="select-field text-red-600 font-semibold" value={form.discount_percentage || 0} onChange={handleDiscountChange}>
                      <option value="0">None (0%)</option>
                      <option value="5">5% off Tuition</option>
                      <option value="10">10% off Tuition</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Discount Amount (₹)</label><input type="number" step="0.01" className="input-field text-red-600 bg-[#f8f9fa] border-transparent font-mono" value={form.discount_amount} readOnly title="Auto-calculated" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Discount Reason</label><input className="input-field" disabled={!form.discount_amount} value={form.discount_reason} onChange={(e) => setForm({ ...form, discount_reason: e.target.value })} placeholder="e.g. Scholarship" maxLength={255} required={form.discount_amount > 0} /></div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Transport Fee (₹)</label><input type="number" step="0.01" min="0" className="input-field" value={form.transport_fee} onChange={(e) => setForm({ ...form, transport_fee: parseFloat(e.target.value) || 0 })} title="Auto-populated from Transport selection but editable" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Other Fees (₹)</label><input type="number" step="0.01" min="0" className="input-field" value={form.other_fee} onChange={(e) => setForm({ ...form, other_fee: parseFloat(e.target.value) || 0 })} title="Auto-populated Admission + Activity Fees but editable" /></div>
                  
                  {/* Total Calculation */}
                  <div className="md:col-span-2 bg-[#f8f9fa] rounded-lg p-3 border flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                    <div>
                      <p className="text-[11px] font-bold text-[#868e96] uppercase tracking-wider">Total Monthly Obligation</p>
                      <p className="text-xs text-[#adb5bd] mt-0.5">Base - Discount + Transport + Other</p>
                    </div>
                    <div className="text-xl font-heading font-bold text-[#4263eb]">₹{form.total_fee.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary px-6" onClick={() => { resetForm(); if (selectedStudent) { setIsEditing(false); } else { setActiveTab("directory"); } }}>Cancel</button>
                <button type="submit" className="btn-primary px-8 py-2.5 text-sm">{editingId ? "Save Changes" : "Confirm Admission"}</button>
              </div>

            </form>
          )}
        </div>
      )}

      {/* ═══════ TAB 3: PASSED OUT ═══════ */}
      {activeTab === "passedout" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex items-center rounded-lg border bg-white overflow-hidden flex-1 max-w-md" style={{ borderColor: "var(--color-border)" }}>
              <div className="pointer-events-none flex items-center pl-3.5">
                <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search passed out students..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
            </div>
            <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{passedOut.length} alumni</span>
          </div>

          {passedOut.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>
              </div>
              <h3 className="text-base font-bold text-[#212529]">No Passed Out Students</h3>
              <p className="text-sm text-[#868e96] mt-1">Students who complete the highest grade will appear here after promotion.</p>
            </div>
          ) : (
            <>
              <div className="card overflow-hidden p-0 border border-[#e9ecef]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[11px] uppercase tracking-wider text-[#868e96] font-bold">
                      <tr>
                        <th className="px-5 py-3.5">ID</th>
                        <th className="px-5 py-3.5">Name</th>
                        <th className="px-5 py-3.5">Last Class</th>
                        <th className="px-5 py-3.5">Admission Date</th>
                        <th className="px-5 py-3.5">Father's Name</th>
                        <th className="px-5 py-3.5">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f5]">
                      {passedOut
                        .filter(s => {
                          const q = poSearch.toLowerCase();
                          if (!q) return true;
                          return `${s.first_name} ${s.last_name} ${s.father_name || ""} ${s.id}`.toLowerCase().includes(q);
                        })
                        .slice((poPage - 1) * pageSize, poPage * pageSize)
                        .map(s => (
                          <tr key={s.id} className="hover:bg-[#f8f9fa] transition-colors">
                            <td className="px-5 py-3 font-mono text-[#4263eb] font-bold">#{s.id}</td>
                            <td className="px-5 py-3 font-semibold text-[#212529]">{s.first_name} {s.last_name}</td>
                            <td className="px-5 py-3"><span className="pill pill-info">{classMap[s.class_id] || s.class_id}</span></td>
                            <td className="px-5 py-3 text-[#495057]">{formatDate(s.admission_date)}</td>
                            <td className="px-5 py-3 text-[#495057]">{s.father_name || "—"}</td>
                            <td className="px-5 py-3 text-[#495057]">{s.parent_contact || s.phone || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                page={poPage}
                totalPages={Math.max(1, Math.ceil(passedOut.filter(s => { const q = poSearch.toLowerCase(); if (!q) return true; return `${s.first_name} ${s.last_name} ${s.father_name || ""} ${s.id}`.toLowerCase().includes(q); }).length / pageSize))}
                onPageChange={setPoPage}
                totalRecords={passedOut.length}
                pageSize={pageSize}
              />
            </>
          )}
        </div>
      )}

      {cropperSrc && (
        <ImageCropper imageSrc={cropperSrc} onCropDone={handleCropDone} onClose={() => setCropperSrc(null)} />
      )}

      {/* ═══════ ADMISSION SUCCESS OVERLAY ═══════ */}
      {admissionSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-8 py-7 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Admission Confirmed!</h2>
              <p className="text-emerald-100 text-sm mt-1">
                {admissionSuccess.first_name} {admissionSuccess.last_name} has been successfully admitted.
              </p>
            </div>

            {/* Details */}
            <div className="px-8 py-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Student ID</p>
                  <p className="font-mono font-bold text-[#4263eb] mt-0.5">#{admissionSuccess.id}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Class</p>
                  <p className="font-semibold text-[#212529] mt-0.5">{classMap[admissionSuccess.class_id] || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Admission Date</p>
                  <p className="font-semibold text-[#212529] mt-0.5">{formatDate(admissionSuccess.admission_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Fee</p>
                  <p className="font-mono font-bold text-[#212529] mt-0.5">₹{(admissionSuccess.total_fee || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-6 flex items-center gap-3">
              <button
                onClick={() => {
                  const letterHtml = letterRef.current?.innerHTML || "";
                  const iframe = document.createElement('iframe');
                  iframe.style.position = 'absolute';
                  iframe.style.width = '0px';
                  iframe.style.height = '0px';
                  iframe.style.border = 'none';
                  document.body.appendChild(iframe);
                  
                  const doc = iframe.contentWindow.document;
                  doc.open();
                  doc.write(`<!DOCTYPE html><html><head><title>Admission Letter – ${admissionSuccess.first_name} ${admissionSuccess.last_name}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${letterHtml}</body></html>`);
                  doc.close();
                  
                  setTimeout(() => { 
                    iframe.contentWindow.focus(); 
                    iframe.contentWindow.print(); 
                    setTimeout(() => {
                      if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                      }
                    }, 1000);
                  }, 400);
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print Admission Letter
              </button>
              <button
                onClick={() => { setAdmissionSuccess(null); setActiveTab("directory"); }}
                className="btn-secondary flex-1 py-2.5"
              >
                Done
              </button>
            </div>
          </div>

        </div>
      )}
      
      {/* Hidden letter for printing (Global) */}
      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        {(admissionSuccess || selectedStudent) && (
          <AdmissionLetter 
            ref={letterRef} 
            student={admissionSuccess || selectedStudent} 
            className={classMap[(admissionSuccess || selectedStudent).class_id] || "—"} 
            school={schoolSettings} 
          />
        )}
      </div>
      {/* Hall Ticket Generation Modal */}
      {showHallTicket && (
        <HallTicketModal 
          student={showHallTicket} 
          onClose={() => setShowHallTicket(null)} 
        />
      )}
    </div>
  );
}
