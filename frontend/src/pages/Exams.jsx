import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import SearchBar from "../components/SearchBar.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { formatDate } from "../utils/dateFormatter.js";
import { sanitizeText } from "../utils/inputSanitizer.js";

const emptyForm = { name: "", term: "", date: "", class_id: "", max_marks: "", description: "", exam_type: "FA1", subject_code: "" };

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeType, setActiveType] = useState("FA1");
  const [activeClass, setActiveClass] = useState(null);
  const limit = 10;
  
  const EXAM_TYPES = ["FA1", "FA2", "SA1", "FA3", "FA4", "SA2"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [exRes, clsRes, subRes] = await Promise.all([
        api.get("/exams/?limit=1000"),
        api.get("/classes/?limit=1000"),
        api.get("/subjects/?limit=1000"),
      ]);
      setExams(exRes.data);
      setClassesList(clsRes.data);
      setSubjectsList(subRes.data);
      setError(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : "Failed to load data");
    }
  };

  const classMap = new Map(classesList.map((c) => [c.id, c.name]));

  const typeExams = useMemo(() => exams.filter(ex => ex.exam_type === activeType), [exams, activeType]);
  
  const availableClasses = useMemo(() => {
    const ids = [...new Set(typeExams.map(ex => ex.class_id))];
    return classesList.filter(c => ids.includes(c.id));
  }, [typeExams, classesList]);

  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!activeClass || !availableClasses.some(c => c.id === activeClass)) {
        setActiveClass(availableClasses[0].id);
      }
    } else {
      setActiveClass(null);
    }
  }, [availableClasses, activeClass]);

  const filtered = useMemo(() => typeExams.filter((ex) => {
    if (ex.class_id !== activeClass) return false;
    const term = search.toLowerCase();
    return ex.name.toLowerCase().includes(term) || ex.term.toLowerCase().includes(term);
  }), [typeExams, activeClass, search]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedFiltered = useMemo(() => {
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

  const totalPages = Math.ceil(sortedFiltered.length / limit);
  const paged = sortedFiltered.slice((page - 1) * limit, page * limit);

  const handleBulkAdd = async () => {
    if (!form.class_id || !form.term || !form.date) {
      alert("Please select Class, Term, and Start Date first.");
      return;
    }
    const classSubjects = subjectsList.filter(s => String(s.class_id) === String(form.class_id));
    if (classSubjects.length === 0) {
      alert("No subjects found for this class.");
      return;
    }

    setLoading(true);
    try {
      const payloadBase = {
        term: form.term,
        date: form.date,
        class_id: parseInt(form.class_id),
        max_marks: parseFloat(form.max_marks) || 100,
        description: form.description || "",
        exam_type: form.exam_type,
      };

      for (const sub of classSubjects) {
        await api.post("/exams/", {
          ...payloadBase,
          name: sub.name,
          subject_code: sub.code,
        });
      }
      fetchData();
      setForm(emptyForm);
      alert(`Successfully added ${classSubjects.length} exams.`);
    } catch (err) {
      const msg = err.response?.data?.detail;
      const errorStr = typeof msg === 'string' ? msg : (Array.isArray(msg) ? msg[0]?.msg : "Check if all fields are filled.");
      alert("Bulk Add Failed: " + errorStr);
      setError("Bulk Add Failed: " + errorStr);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ex) => {
    setForm({
      id: ex.id,
      name: ex.name || "",
      term: ex.term || "",
      date: ex.date || "",
      class_id: ex.class_id || "",
      max_marks: ex.max_marks || "",
      description: ex.description || "",
      exam_type: ex.exam_type || "FA1",
      subject_code: ex.subject_code || ""
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.delete(`/exams/${id}`);
      fetchData();
    } catch (err) {
      setError("Delete failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/exams/${form.id}`, form);
      } else {
        await api.post("/exams/", form);
      }
      setForm(emptyForm);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : "Action failed");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Subject" },
    { key: "term", label: "Term" },
    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
    { key: "max_marks", label: "Max Marks" },
    {
      key: "actions",
      label: "Actions",
      render: (ex) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(ex)} className="text-blue-600 hover:text-blue-800">
            Edit
          </button>
          <button onClick={() => handleDelete(ex.id)} className="text-red-600 hover:text-red-800">
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header animate-slide-in-left">
        <div className="page-icon">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-ink">Exams</h1>
          <p className="text-sm text-muted">Manage school examinations and terms.</p>
        </div>
        <div className="ml-auto">
           <button 
             onClick={() => window.location.href='/students'} 
             className="btn-secondary text-xs flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
             Generate Hall Tickets (via Students)
           </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
        <h2 className="text-lg font-semibold text-ink mb-4">{isEditing ? "Edit Exam" : "Add New Exam"}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select
            className="select-field border-indigo-200 bg-indigo-50/30"
            value={form.class_id}
            onChange={(e) => setForm({ ...form, class_id: parseInt(e.target.value) || "" })}
            required
          >
            <option value="">Select Class First</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="select-field"
            value={form.name}
            onChange={(e) => {
              const sub = subjectsList.find(s => s.name === e.target.value);
              setForm({ ...form, name: e.target.value, subject_code: sub?.code || "" });
            }}
            disabled={!form.class_id}
            required
          >
            <option value="">{form.class_id ? "Select Subject" : "Select Class Above"}</option>
            {subjectsList.filter(s => String(s.class_id) === String(form.class_id)).map(s => (
              <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Academic Term (e.g. 2024-25)"
            value={form.term}
            onChange={(e) => setForm({ ...form, term: sanitizeText(e.target.value) })}
            required
            minLength={2}
            maxLength={50}
          />
          <input
            className="input-field bg-gray-50"
            placeholder="Subject Code"
            value={form.subject_code}
            readOnly
          />
          <input
            type="date"
            className="input-field"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <select
            className="select-field"
            value={form.exam_type}
            onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
            required
          >
            <option value="FA1">FA1 (Formative 1)</option>
            <option value="FA2">FA2 (Formative 2)</option>
            <option value="SA1">SA1 (Semester 1)</option>
            <option value="FA3">FA3 (Formative 3)</option>
            <option value="FA4">FA4 (Formative 4)</option>
            <option value="SA2">SA2 (Semester 2)</option>
          </select>
          <input
            type="number"
            step="0.01"
            className="input-field"
            placeholder="Max Marks"
            value={form.max_marks}
            onChange={(e) => setForm({ ...form, max_marks: parseFloat(e.target.value) || "" })}
            required
            min="1"
            max="1000"
          />
          <input
            className="input-field"
            placeholder="Description (Optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: sanitizeText(e.target.value) })}
            maxLength={255}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button type="submit" className="btn-primary">
            {isEditing ? "Update Exam" : "Add Exam"}
          </button>
          {!isEditing && (
            <button type="button" onClick={handleBulkAdd} className="btn-secondary bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
              Bulk Add All Subjects
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForm(emptyForm);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-4 animate-slide-up" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
        {/* Level 1: Exam Type Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit overflow-x-auto max-w-full">
          {EXAM_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { setActiveType(type); setPage(1); }}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeType === type
                  ? "bg-white dark:bg-slate-700 text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Level 2: Class Pills */}
        {availableClasses.length > 0 && (
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit overflow-x-auto max-w-full">
            {availableClasses.map(cls => (
              <button
                key={cls.id}
                onClick={() => { setActiveClass(cls.id); setPage(1); }}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeClass === cls.id
                    ? "bg-white dark:bg-slate-700 text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." />
          <ImportExportToolbar
            data={filtered.map(r => {
              return { ...r, class_name: classMap.get(r.class_id) || r.class_id };
            })}
            columns={[...columns, { key: "class_name", label: "Class" }]}
            filename={`Exams_${activeType}_Export`}
            templateFields={Object.keys(emptyForm)}
            importEndpoint="/exams/import"
            onImportSuccess={fetchData}
          />
        </div>
        
        {availableClasses.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-sm font-medium text-muted">No exams scheduled for {activeType}.</p>
          </div>
        ) : (
          <>
            <Table columns={columns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
