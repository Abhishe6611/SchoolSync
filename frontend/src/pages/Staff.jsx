import { useEffect, useMemo, useState, useRef } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import SearchBar from "../components/SearchBar.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import ImageCropper from "../components/ImageCropper.jsx";
import StaffOfferLetter from "../components/StaffOfferLetter.jsx";
import { formatDate } from "../utils/dateFormatter.js";
import useAutoSave from "../hooks/useAutoSave.js";
import { sanitizeName, sanitizeDigits, sanitizeEmail, sanitizeText } from "../utils/inputSanitizer.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const emptyForm = { first_name: "", last_name: "", role: "", email: "", phone: "", hire_date: "", address: "", gender: "", dob: "", blood_group: "", qualification: "", experience_years: "" };

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm, clearForm] = useAutoSave("staff_form_draft", emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const pageSize = 10;

  const [activeTab, setActiveTab] = useState("directory");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);
  const [cropperSrc, setCropperSrc] = useState(null);
  const [hiringSuccess, setHiringSuccess] = useState(null);
  const letterRef = useRef(null);
  const [schoolSettings, setSchoolSettings] = useState(null);

  const fetchStaff = async () => { const response = await api.get("/staff"); setStaff(response.data); };
  useEffect(() => {
    fetchStaff();
    api.get("/admin/school-settings").then(r => setSchoolSettings(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return staff.filter((m) => `${m.first_name} ${m.last_name} ${m.role}`.toLowerCase().includes(term));
  }, [staff, search]);

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

  useEffect(() => { setPage(1); }, [search, sortConfig]);
  const totalPages = Math.max(1, Math.ceil(sortedAndFiltered.length / pageSize));
  const paged = sortedAndFiltered.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => { clearForm(); setEditingId(null); setIsEditing(false); };

  useEffect(() => {
    if (activeTab === "profile" && !editingId && !selectedStaff) {
      const today = new Date().toISOString().split("T")[0];
      setForm(f => (f.hire_date ? f : { ...f, hire_date: today }));
    }
  }, [activeTab, editingId, selectedStaff]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, experience_years: Number(form.experience_years) };

      let res;
      if (editingId) { 
        res = await api.put(`/staff/${editingId}`, payload); 
      } else { 
        res = await api.post("/staff", payload); 
      }
      const wasNew = !editingId;
      resetForm();
      
      if (res?.offline) {
        setActiveTab("directory");
        return;
      }

      await fetchStaff();
      if (wasNew && res?.data) {
        setHiringSuccess(res.data);
      } else if (editingId && selectedStaff) {
        const updated = (await api.get("/staff")).data.find(s => s.id === editingId);
        setSelectedStaff(updated);
      } else {
        setActiveTab("directory");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save staff data. Please check your inputs.");
    }
  };

  const handleViewProfile = (member) => { setSelectedStaff(member); setActiveTab("profile"); setIsEditing(false); resetForm(); };

  const handleEditFromProfile = () => {
    setEditingId(selectedStaff.id);
    setForm({
      first_name: selectedStaff.first_name, last_name: selectedStaff.last_name, role: selectedStaff.role,
      email: selectedStaff.email || "", phone: selectedStaff.phone || "", hire_date: selectedStaff.hire_date,
      address: selectedStaff.address || "", gender: selectedStaff.gender || "", dob: selectedStaff.dob || "",
      blood_group: selectedStaff.blood_group || "", qualification: selectedStaff.qualification || "",
      experience_years: selectedStaff.experience_years || ""
    });
    setIsEditing(true);
  };

  const handleDeleteFromProfile = async () => {
    if (!confirm("Delete this staff member?")) return;
    await api.delete(`/staff/${selectedStaff.id}`);
    await fetchStaff();
    setSelectedStaff(null);
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
    if (!selectedStaff) return;
    const formData = new FormData();
    formData.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    try {
      const res = await api.post(`/staff/${selectedStaff.id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setSelectedStaff({ ...selectedStaff, photo_url: res.data.photo_url });
      await fetchStaff();
    } catch (err) { alert("Photo upload failed."); }
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setEditingId(null);
    setIsEditing(false);
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...emptyForm, hire_date: today });
    setActiveTab("profile");
  };

  const getTenure = (hireDate) => {
    if (!hireDate) return "—";
    const start = new Date(hireDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} year${years > 1 ? "s" : ""}${months > 0 ? `, ${months} month${months > 1 ? "s" : ""}` : ""}`;
    if (months > 0) return `${months} month${months > 1 ? "s" : ""}`;
    return "Less than a month";
  };

  const getAvatarUrl = (person) => {
    if (person?.photo_url) return `${API_BASE}${person.photo_url}`;
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent((person?.first_name || "U") + " " + (person?.last_name || ""))}&backgroundColor=212529&textColor=ffffff&fontSize=40`;
  };

  const handleGenerateId = async () => {
    if (!selectedStaff) return;
    try {
      const { generateIdCards } = await import("../utils/idCardGenerator.js");
      await generateIdCards([selectedStaff], "staff");
    } catch (err) {
      console.error("Failed to generate ID card", err);
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "role", label: "Role" },
    { key: "email", label: "Email" },
    { key: "hire_date", label: "Hire Date", render: (row) => formatDate(row.hire_date) },
    { key: "actions", label: "Actions", render: (row) => (
      <button className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] transition-colors" onClick={() => handleViewProfile(row)}>View Profile</button>
    )},
  ];

  const DetailItem = ({ label, value, icon }) => (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--color-border-light, #f1f3f5)" }}>
      <div className="w-8 h-8 rounded-lg bg-[#f1f3f5] flex items-center justify-center text-[#868e96] flex-shrink-0 mt-0.5"><span className="text-xs">{icon}</span></div>
      <div><p className="text-[10px] uppercase tracking-wider font-bold text-[#adb5bd]">{label}</p><p className="text-[13px] font-medium text-[#212529] mt-0.5">{value || "—"}</p></div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">Manage staff directory and roles.</p>
        </div>
        {activeTab === "directory" && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleAddNew} className="btn-primary text-xs py-1.5 px-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Staff
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
          Profile
        </button>
      </div>

      {/* ═══════ TAB 1: DIRECTORY ═══════ */}
      {activeTab === "directory" && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex items-center rounded-lg border bg-white overflow-hidden flex-1 max-w-md" style={{ borderColor: "var(--color-border)" }}>
              <div className="pointer-events-none flex items-center pl-3.5">
                <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{filtered.length} records</span>
              <ImportExportToolbar data={filtered} columns={columns} filename="Staff_Export" templateFields={Object.keys(emptyForm)} importEndpoint="/staff/import" onImportSuccess={fetchStaff} />
            </div>
          </div>
          <Table columns={columns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={filtered.length} pageSize={pageSize} />
        </div>
      )}

      {/* ═══════ TAB 2: PROFILE ═══════ */}
      {activeTab === "profile" && (
        <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          {selectedStaff && !isEditing ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Avatar Card */}
              <div className="card flex flex-col items-center text-center py-8">
                <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                  <img src={getAvatarUrl(selectedStaff)} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#f1f3f5]" style={{ boxShadow: "0 2px 8px -2px rgb(0 0 0 / 0.1)" }} />
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
                <h2 className="text-lg font-heading font-bold text-[#212529]">{selectedStaff.first_name} {selectedStaff.last_name}</h2>
                <p className="text-[13px] text-[#868e96] mt-0.5">Staff Code: <span className="font-mono font-bold text-[#4263eb]">SS-{String(selectedStaff.id).padStart(4, "0")}</span></p>
                <span className="mt-2 pill pill-info">{selectedStaff.role}</span>
                <div className="mt-5 flex gap-2 w-full px-4">
                  <button onClick={handleEditFromProfile} className="btn-primary text-xs flex-1 py-2">Edit Profile</button>
                  <button onClick={handleDeleteFromProfile} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50 py-2">Delete</button>
                </div>
                <button onClick={handleGenerateId} className="mt-3 w-full mx-4 btn-secondary text-xs flex items-center justify-center gap-2 text-[#4263eb] border-[#4263eb] hover:bg-[#edf2ff] py-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                  Generate ID Card
                </button>
                <button onClick={() => { setActiveTab("directory"); resetForm(); setSelectedStaff(null); }} className="mt-3 text-xs text-[#868e96] hover:text-[#495057] transition-colors">← Back to Directory</button>
              </div>

              {/* Right: Details */}
              <div className="lg:col-span-2 space-y-5">
                {/* Joining Date Highlight */}
                <div className="card bg-[#f8f9fa] border-none shadow-none">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#212529] flex items-center justify-center text-white flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#868e96]">Joining Date</p>
                      <p className="text-lg font-heading font-bold text-[#212529] leading-tight">{formatDate(selectedStaff.hire_date)}</p>
                      <p className="text-[11px] text-[#495057]">Tenure: <span className="font-semibold text-[#4263eb]">{getTenure(selectedStaff.hire_date)}</span></p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-sm font-semibold text-[#212529] mb-4">Personal & Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <DetailItem label="Designation" value={selectedStaff.role} icon="💼" />
                    <DetailItem label="Email" value={selectedStaff.email} icon="✉️" />
                    <DetailItem label="Phone" value={selectedStaff.phone} icon="📞" />
                    <DetailItem label="Gender" value={selectedStaff.gender} icon="👤" />
                    <DetailItem label="Date of Birth" value={selectedStaff.dob} icon="🎂" />
                    <DetailItem label="Blood Group" value={selectedStaff.blood_group} icon="🩸" />
                    <DetailItem label="Qualification" value={selectedStaff.qualification} icon="🎓" />
                    <DetailItem label="Experience" value={`${selectedStaff.experience_years} years`} icon="⭐" />
                    <div className="md:col-span-2">
                      <DetailItem label="Address" value={selectedStaff.address} icon="📍" />
                    </div>
                    <DetailItem label="Status" value={selectedStaff.is_active ? "Active" : "Inactive"} icon="🟢" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── ADD / EDIT FORM ── */
            <div className="card max-w-3xl">
              <h2 className="text-sm font-semibold text-[#212529] mb-5">{editingId ? "Edit Staff Member" : "Add New Staff Member"}</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">First Name <span className="text-red-500">*</span></label><input className="input-field" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Last Name <span className="text-red-500">*</span></label><input className="input-field" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={50} title="Only letters and spaces allowed (2–50 chars)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Role / Designation <span className="text-red-500">*</span></label><input className="input-field" placeholder="Role / Designation" value={form.role} onChange={(e) => setForm({ ...form, role: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" /></div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Email <span className="text-red-500">*</span></label><input className="input-field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: sanitizeEmail(e.target.value) })} required maxLength={100} pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Enter a valid email address (e.g. user@example.com)" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Phone <span className="text-red-500">*</span></label><input className="input-field" type="tel" pattern="^[0-9]{10}$" maxLength="10" title="Please enter a valid 10-digit mobile number" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizeDigits(e.target.value) })} required /></div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Gender <span className="text-red-500">*</span></label>
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
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Date of Birth <span className="text-red-500">*</span></label><input type="date" className="input-field" value={form.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, dob: e.target.value })} required /></div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Blood Group <span className="text-red-500">*</span></label>
                    <select className="select-field" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} required>
                      <option value="">Select</option>
                      <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Qualification <span className="text-red-500">*</span></label><input className="input-field" placeholder="e.g. M.Sc, B.Ed" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" /></div>
                  <div><label className="block text-xs font-semibold text-[#495057] mb-1">Experience (Years) <span className="text-red-500">*</span></label><input className="input-field" type="number" min="0" max="50" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} required title="0–50 years" /></div>
                  <div className="md:col-span-2 lg:col-span-3"><label className="block text-xs font-semibold text-[#495057] mb-1">Address <span className="text-red-500">*</span></label><input className="input-field" placeholder="Full residential address" value={form.address} onChange={(e) => setForm({ ...form, address: sanitizeText(e.target.value) })} required minLength={5} maxLength={255} title="5–255 characters" /></div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-[#495057] mb-1">Hire / Joining Date <span className="text-red-500">*</span></label>
                    <div className="input-field flex items-center bg-[#f8f9fa] text-[#495057] cursor-not-allowed border-transparent">
                      {formatDate(form.hire_date)}
                    </div>
                    <input type="hidden" name="hire_date" value={form.hire_date} />
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button type="submit" className="btn-primary">{editingId ? "Update Staff" : "Add Staff"}</button>
                  <button type="button" className="btn-secondary" onClick={() => { resetForm(); if (selectedStaff) { setIsEditing(false); } else { setActiveTab("directory"); } }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {/* Image Cropper Modal */}
      {cropperSrc && (
        <ImageCropper imageSrc={cropperSrc} onCropDone={handleCropDone} onClose={() => setCropperSrc(null)} />
      )}

      {/* ═══════ HIRING SUCCESS OVERLAY ═══════ */}
      {hiringSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-8 py-7 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Staff Member Added!</h2>
              <p className="text-blue-100 text-sm mt-1">
                {hiringSuccess.first_name} {hiringSuccess.last_name} has been successfully onboarded.
              </p>
            </div>
            <div className="px-8 py-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Staff Code</p>
                  <p className="font-mono font-bold text-[#4263eb] mt-0.5">SS-{String(hiringSuccess.id).padStart(4, "0")}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Designation</p>
                  <p className="font-semibold text-[#212529] mt-0.5">{hiringSuccess.role || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Joining Date</p>
                  <p className="font-semibold text-[#212529] mt-0.5">{formatDate(hiringSuccess.hire_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Qualification</p>
                  <p className="font-semibold text-[#212529] mt-0.5">{hiringSuccess.qualification || "—"}</p>
                </div>
              </div>
            </div>
            <div className="px-8 pb-6 flex items-center gap-3">
              <button
                onClick={() => {
                  const printWin = window.open("", "_blank", "width=900,height=1100");
                  const letterHtml = letterRef.current?.innerHTML || "";
                  printWin.document.write(`<!DOCTYPE html><html><head><title>Offer Letter \u2013 ${hiringSuccess.first_name} ${hiringSuccess.last_name}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${letterHtml}</body></html>`);
                  printWin.document.close();
                  setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
                }}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print Offer Letter
              </button>
              <button
                onClick={() => { setHiringSuccess(null); setActiveTab("directory"); }}
                className="btn-secondary flex-1 py-2.5"
              >
                Done
              </button>
            </div>
          </div>
          <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
            <StaffOfferLetter ref={letterRef} staff={hiringSuccess} school={schoolSettings} />
          </div>
        </div>
      )}
    </div>
  );
}
