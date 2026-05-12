import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { sanitizeText } from "../utils/inputSanitizer.js";

const emptyForm = { name: "", section: "", year: "", advisor_id: "" };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const pageSize = 10;

  const fetchData = async () => {
    const [classRes, staffRes] = await Promise.all([api.get("/classes"), api.get("/staff")]);
    setClasses(classRes.data);
    setStaff(staffRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return classes.filter((i) => `${i.name} ${i.section} ${i.year}`.toLowerCase().includes(term));
  }, [classes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || "").toLowerCase(); }
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

  useEffect(() => { setPage(1); }, [search, sortConfig]);
  const paged = sortedAndFiltered.slice((page - 1) * pageSize, page * pageSize);
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, advisor_id: form.advisor_id ? Number(form.advisor_id) : null };
    if (editingId) await api.put(`/classes/${editingId}`, payload);
    else await api.post("/classes", payload);
    resetForm(); await fetchData();
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, section: c.section, year: c.year, advisor_id: c.advisor_id ? String(c.advisor_id) : "" });
  };

  const handleDelete = async (id) => { if (!confirm("Delete this class?")) return; await api.delete(`/classes/${id}`); await fetchData(); };

  const columns = [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "section", label: "Section" },
    { key: "year", label: "Year" }, { key: "advisor_id", label: "Advisor", render: (row) => row.advisor_id ? <span className="pill pill-neutral">ID: {row.advisor_id}</span> : "—" },
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
        <h1 className="page-title">Classes</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Define classes, sections, and advisors.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
          <form onSubmit={handleSubmit} className="card sticky top-24">
            <h2 className="text-sm font-semibold text-[#212529] mb-4">{editingId ? "Edit Class" : "Add New Class"}</h2>
            <div className="space-y-4">
              <input className="input-field" placeholder="Class name" value={form.name} onChange={(e) => setForm({ ...form, name: sanitizeText(e.target.value) })} required minLength={1} maxLength={20} title="1–20 characters" />
              <input className="input-field" placeholder="Section" value={form.section} onChange={(e) => setForm({ ...form, section: sanitizeText(e.target.value) })} required minLength={1} maxLength={10} title="1–10 characters" />
              <input className="input-field" type="number" placeholder="Year" min="2000" max="2100" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required title="Enter a year between 2000–2100" />
              <select className="select-field" value={form.advisor_id} onChange={(e) => setForm({ ...form, advisor_id: e.target.value })}>
                <option value="">Advisor (optional)</option>
                {staff.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="submit" className="btn-primary w-full">{editingId ? "Update" : "Add Class"}</button>
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
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{filtered.length} records</span>
              <ImportExportToolbar
                data={filtered}
                columns={columns}
                filename="Classes_Export"
                templateFields={Object.keys(emptyForm)}
                importEndpoint="/classes/import"
                onImportSuccess={fetchData}
              />
            </div>
          </div>
          <Table columns={columns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={filtered.length} pageSize={pageSize} />
        </div>
      </div>
    </div>
  );
}
