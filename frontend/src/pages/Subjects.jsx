import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { sanitizeText, sanitizeCode } from "../utils/inputSanitizer.js";

const emptyForm = { name: "", code: "", class_id: "" };

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchData = async () => {
    const [sRes, cRes] = await Promise.all([api.get("/subjects"), api.get("/classes")]);
    setSubjects(sRes.data); setClasses(cRes.data);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return subjects.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(t));
  }, [subjects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, class_id: Number(form.class_id) };
    if (editingId) await api.put(`/subjects/${editingId}`, payload);
    else await api.post("/subjects", payload);
    resetForm(); await fetchData();
  };
  const handleEdit = (s) => { setEditingId(s.id); setForm({ name: s.name, code: s.code, class_id: String(s.class_id) }); };
  const handleDelete = async (id) => { if (!confirm("Delete this subject?")) return; await api.delete(`/subjects/${id}`); await fetchData(); };

  const columns = [
    { key: "id", label: "ID" }, 
    { key: "name", label: "Name" }, 
    { key: "code", label: "Code", render: (row) => <span className="font-mono text-xs font-semibold text-[#495057] bg-[#f1f3f5] px-2 py-0.5 rounded-md">{row.code}</span> }, 
    { key: "class_id", label: "Class ID" },
    { key: "actions", label: "Actions", render: (row) => (
      <div className="flex items-center gap-3">
        <button className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] transition-colors" onClick={() => handleEdit(row)}>Edit</button>
        <button className="text-[13px] font-semibold text-red-500 hover:text-red-600 transition-colors" onClick={() => handleDelete(row.id)}>Delete</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="animate-slide-up">
        <h1 className="page-title">Subjects</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Assign subjects to classes and maintain codes.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
          <form onSubmit={handleSubmit} className="card sticky top-24">
            <h2 className="text-sm font-semibold text-[#212529] mb-4">{editingId ? "Edit Subject" : "Add New Subject"}</h2>
            <div className="space-y-4">
              <input className="input-field" placeholder="Subject name" value={form.name} onChange={(e) => setForm({ ...form, name: sanitizeText(e.target.value) })} required minLength={2} maxLength={100} title="2–100 characters" />
              <input className="input-field" placeholder="Subject Code" value={form.code} onChange={(e) => setForm({ ...form, code: sanitizeCode(e.target.value) })} required minLength={2} maxLength={20} title="Letters, numbers, hyphens, underscores only (2–20 chars)" />
              <select className="select-field" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="submit" className="btn-primary w-full">{editingId ? "Update" : "Add Subject"}</button>
              {editingId && <button type="button" className="btn-secondary w-full" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex items-center rounded-lg border bg-white overflow-hidden flex-1 max-w-sm" style={{ borderColor: "var(--color-border)" }}>
              <div className="pointer-events-none flex items-center pl-3.5">
                <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{filtered.length} records</span>
              <ImportExportToolbar
                data={filtered}
                columns={columns}
                filename="Subjects_Export"
                templateFields={Object.keys(emptyForm)}
                importEndpoint="/subjects/import"
                onImportSuccess={fetchData}
              />
            </div>
          </div>
          <Table columns={columns} data={paged} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={filtered.length} pageSize={pageSize} />
        </div>
      </div>
    </div>
  );
}
