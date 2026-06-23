import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Table from "../components/Table.jsx";
import Pagination from "../components/Pagination.jsx";
import { generatePayslipPDF } from "../utils/payslipGenerator.js";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const emptyStructure = {
  staff_id: "",
  base_salary: "",
  transport_allowance: "",
  medical_allowance: "",
  other_allowances: "",
  standard_deductions: "",
};

export default function Payroll() {
  const [tab, setTab] = useState("processing");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Processing tab
  const [payslips, setPayslips] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  // Salary Structure tab
  const [staffList, setStaffList] = useState([]);
  const [structures, setStructures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyStructure);
  const [editingId, setEditingId] = useState(null);

  // Daily Wage tab
  const [dailyWages, setDailyWages] = useState([]);
  const [dailyStart, setDailyStart] = useState(new Date(now.getFullYear(), now.getMonth(), 2).toISOString().split("T")[0]);
  const [dailyEnd, setDailyEnd] = useState(now.toISOString().split("T")[0]);

  // Pagination
  const [page, setPage] = useState(1);
  const [structPage, setStructPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [structSortConfig, setStructSortConfig] = useState({ key: 'id', direction: 'asc' });
  const pageSize = 10;

  // ── Data Fetching ──
  const fetchPayslips = async () => {
    try {
      const res = await api.get(`/payroll/${month}/${year}`);
      setPayslips(res.data);
    } catch { setPayslips([]); }
  };

  const fetchStructures = async () => {
    try {
      const [structRes, staffRes] = await Promise.all([
        api.get("/payroll/structures"),
        api.get("/staff"),
      ]);
      setStructures(structRes.data);
      setStaffList(staffRes.data);
    } catch { /* */ }
  };

  useEffect(() => {
    fetchStructures();
  }, []);

  useEffect(() => {
    if (tab === "processing") fetchPayslips();
  }, [tab, month, year]);

  const fetchDailyWages = async () => {
    try {
      const res = await api.get(`/payroll/daily-wage-report?start_date=${dailyStart}&end_date=${dailyEnd}`);
      setDailyWages(res.data);
    } catch { setDailyWages([]); }
  };

  useEffect(() => {
    if (tab === "daily") fetchDailyWages();
  }, [tab, dailyStart, dailyEnd]);

  // ── Handlers ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenMessage("");
    try {
      const res = await api.post(`/payroll/generate/${month}/${year}`);
      setGenMessage(res.data.message);
      await fetchPayslips();
    } catch (err) {
      setGenMessage("Failed to generate payroll.");
    }
    setGenerating(false);
  };

  const handlePay = async (id) => {
    await api.put(`/payroll/${id}/pay`);
    await fetchPayslips();
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    await api.post("/payroll/structures", {
      ...form,
      staff_id: Number(form.staff_id),
      base_salary: Number(form.base_salary),
      transport_allowance: Number(form.transport_allowance),
      medical_allowance: Number(form.medical_allowance),
      other_allowances: Number(form.other_allowances),
      standard_deductions: Number(form.standard_deductions),
    });
    setShowForm(false);
    setForm(emptyStructure);
    setEditingId(null);
    await fetchStructures();
  };

  const handleEditStructure = (s) => {
    setForm({
      staff_id: s.staff_id,
      base_salary: s.base_salary,
      transport_allowance: s.transport_allowance,
      medical_allowance: s.medical_allowance,
      other_allowances: s.other_allowances,
      standard_deductions: s.standard_deductions,
    });
    setEditingId(s.staff_id);
    setShowForm(true);
  };

  // ── Staff name helper ──
  const staffName = (id) => {
    const s = staffList.find((st) => st._id === id || st.id === id);
    return s ? `${s.first_name} ${s.last_name}` : `Staff #${id}`;
  };

  // ── Summary stats ──
  const summary = useMemo(() => {
    const total = payslips.reduce((s, p) => s + p.net_payable, 0);
    const paid = payslips.filter((p) => p.status === "Paid").reduce((s, p) => s + p.net_payable, 0);
    const pending = payslips.filter((p) => p.status === "Pending").length;
    return { total, paid, pending, count: payslips.length };
  }, [payslips]);

  // ── Sorting + Pagination ──
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleStructSort = (key) => {
    let direction = 'asc';
    if (structSortConfig.key === key && structSortConfig.direction === 'asc') direction = 'desc';
    setStructSortConfig({ key, direction });
  };

  const sortedPayslips = useMemo(() => {
    if (!sortConfig.key) return payslips;
    return [...payslips].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (sortConfig.key === 'staff_id') { aVal = staffName(aVal).toLowerCase(); bVal = staffName(bVal).toLowerCase(); }
      else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || "").toLowerCase(); }
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payslips, sortConfig, staffList]);

  const sortedStructures = useMemo(() => {
    if (!structSortConfig.key) return structures;
    return [...structures].sort((a, b) => {
      let aVal = a[structSortConfig.key];
      let bVal = b[structSortConfig.key];
      if (structSortConfig.key === 'staff_id') { aVal = staffName(aVal).toLowerCase(); bVal = staffName(bVal).toLowerCase(); }
      else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || "").toLowerCase(); }
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      if (aVal < bVal) return structSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return structSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [structures, structSortConfig, staffList]);

  const totalPages = Math.max(1, Math.ceil(sortedPayslips.length / pageSize));
  const pagedSlips = sortedPayslips.slice((page - 1) * pageSize, page * pageSize);

  const structTotalPages = Math.max(1, Math.ceil(sortedStructures.length / pageSize));
  const pagedStructs = sortedStructures.slice((structPage - 1) * pageSize, structPage * pageSize);

  // ── Payslip Columns ──
  const payslipColumns = [
    { key: "staff_id", label: "Staff", render: (r) => (
      <span className="font-medium text-ink">{staffName(r.staff_id)}</span>
    )},
    { key: "days_present", label: "Present", render: (r) => (
      <span className="font-mono text-sm">{r.days_present}/{r.total_working_days}</span>
    )},
    { key: "unpaid_leave_days", label: "Unpaid Leaves", render: (r) => (
      <span className={`font-mono text-sm ${r.unpaid_leave_days > 0 ? "text-red-600" : "text-muted"}`}>{r.unpaid_leave_days}</span>
    )},
    { key: "base_salary", label: "Base", render: (r) => (
      <span className="font-mono text-sm">₹{r.base_salary.toLocaleString("en-IN")}</span>
    )},
    { key: "total_allowances", label: "Allowances", render: (r) => (
      <span className="font-mono text-sm text-emerald-600">+₹{r.total_allowances.toLocaleString("en-IN")}</span>
    )},
    { key: "leave_deduction", label: "Leave Ded.", render: (r) => (
      <span className={`font-mono text-sm ${r.leave_deduction > 0 ? "text-red-600" : "text-muted"}`}>{r.leave_deduction > 0 ? `-₹${r.leave_deduction.toLocaleString("en-IN")}` : "₹0"}</span>
    )},
    { key: "net_payable", label: "Net Pay", render: (r) => (
      <span className="font-mono text-sm font-bold text-ink">₹{r.net_payable.toLocaleString("en-IN")}</span>
    )},
    { key: "status", label: "Status", render: (r) => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        r.status === "Paid"
          ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20"
          : "bg-amber-500/15 text-amber-700 border border-amber-500/20"
      }`}>{r.status}</span>
    )},
    { key: "actions", label: "Actions", render: (r) => (
      <div className="flex items-center gap-3">
        {r.status === "Pending" ? (
          <button onClick={() => handlePay(r._id || r.id)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            Pay
          </button>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Paid</span>
        )}
        <button 
          onClick={() => {
            const staff = staffList.find(s => (s._id || s.id) === r.staff_id);
            if (staff) generatePayslipPDF(r, staff);
          }} 
          className="text-xs font-semibold text-slate-600 hover:text-primary-600 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" /></svg>
          PDF
        </button>
      </div>
    )},
  ];

  // ── Structure Columns ──
  const structColumns = [
    { key: "staff_id", label: "Staff", render: (r) => (
      <span className="font-medium text-ink">{staffName(r.staff_id)}</span>
    )},
    { key: "base_salary", label: "Base Salary", render: (r) => (
      <span className="font-mono text-sm">₹{r.base_salary.toLocaleString("en-IN")}</span>
    )},
    { key: "transport_allowance", label: "Transport", render: (r) => (
      <span className="font-mono text-sm text-emerald-600">₹{r.transport_allowance.toLocaleString("en-IN")}</span>
    )},
    { key: "medical_allowance", label: "Medical", render: (r) => (
      <span className="font-mono text-sm text-emerald-600">₹{r.medical_allowance.toLocaleString("en-IN")}</span>
    )},
    { key: "other_allowances", label: "Other", render: (r) => (
      <span className="font-mono text-sm text-emerald-600">₹{r.other_allowances.toLocaleString("en-IN")}</span>
    )},
    { key: "standard_deductions", label: "Deductions", render: (r) => (
      <span className="font-mono text-sm text-red-600">₹{r.standard_deductions.toLocaleString("en-IN")}</span>
    )},
    { key: "actions", label: "", render: (r) => (
      <button onClick={() => handleEditStructure(r)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">Edit</button>
    )},
  ];

  // ── Daily Wage Columns ──
  const dailyColumns = [
    { key: "staff_id", label: "Staff", render: (r) => (
      <div>
        <div className="font-medium text-ink">{r.name}</div>
        <div className="text-[10px] text-muted">{r.role}</div>
      </div>
    )},
    { key: "total_paid_days", label: "Paid Days", render: (r) => (
      <span className="font-mono text-sm">{r.total_paid_days}</span>
    )},
    { key: "total_overtime_hours", label: "Overtime (hrs)", render: (r) => (
      <span className="font-mono text-sm">{r.total_overtime_hours > 0 ? r.total_overtime_hours : "—"}</span>
    )},
    { key: "total_gross_wage", label: "Gross Wage", render: (r) => (
      <span className="font-mono text-sm">₹{r.total_gross_wage.toLocaleString("en-IN")}</span>
    )},
    { key: "deductions", label: "Deductions", render: (r) => {
        const totalDed = r.total_advance + r.total_penalty;
        return <span className={`font-mono text-sm ${totalDed > 0 ? "text-red-600" : "text-muted"}`}>{totalDed > 0 ? `-₹${totalDed.toLocaleString("en-IN")}` : "₹0"}</span>
    }},
    { key: "total_net_payable", label: "Net Payable", render: (r) => (
      <span className="font-mono text-sm font-bold text-ink">₹{r.total_net_payable.toLocaleString("en-IN")}</span>
    )},
  ];

  // ── Staff without a salary structure (for dropdown) ──
  const unassignedStaff = staffList.filter((s) => !structures.some((st) => st.staff_id === (s._id || s.id)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <div className="page-header mb-1">
          <div className="page-icon">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink">Payroll</h1>
            <p className="text-sm text-muted">Manage salary structures and process monthly payroll.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          {[
            { id: "processing", label: "Monthly Processing" },
            { id: "structure", label: "Salary Structure" },
            { id: "daily", label: "Daily Wage Timesheet" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                tab === t.id
                  ? "bg-white dark:bg-slate-700 text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ──────── TAB 1: MONTHLY PROCESSING ──────── */}
      {tab === "processing" && (
        <>
          {/* Month/Year Selector */}
          <div className="animate-slide-up" style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="select-field !w-auto"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                className="input-field !w-24"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2020}
                max={2099}
              />
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary flex items-center gap-2"
              >
                {generating ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                )}
                Generate Payroll
              </button>
              {genMessage && (
                <span className="text-sm font-medium text-emerald-600 animate-fade-in">{genMessage}</span>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          {payslips.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "180ms", opacity: 0, animationFillMode: "forwards" }}>
              <div className="card !py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Total Payslips</p>
                <p className="text-xl font-bold font-mono text-ink">{summary.count}</p>
              </div>
              <div className="card !py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Total Payable</p>
                <p className="text-xl font-bold font-mono text-ink">₹{summary.total.toLocaleString("en-IN")}</p>
              </div>
              <div className="card !py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Paid Out</p>
                <p className="text-xl font-bold font-mono text-emerald-600">₹{summary.paid.toLocaleString("en-IN")}</p>
              </div>
              <div className="card !py-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Pending</p>
                <p className="text-xl font-bold font-mono text-amber-600">{summary.pending}</p>
              </div>
            </div>
          )}

          {/* Payslips Table */}
          <div className="animate-slide-up" style={{ animationDelay: "240ms", opacity: 0, animationFillMode: "forwards" }}>
            {payslips.length === 0 ? (
              <div className="card text-center py-16">
                <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm font-medium text-muted">No payslips for {MONTHS[month - 1]} {year}</p>
                <p className="text-xs text-muted mt-1">Click "Generate Payroll" to create payslips from salary structures and attendance data.</p>
              </div>
            ) : (
              <>
                <Table columns={payslipColumns} data={pagedSlips} onSort={handleSort} sortConfig={sortConfig} />
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        </>
      )}

      {/* ──────── TAB 2: SALARY STRUCTURE ──────── */}
      {tab === "structure" && (
        <>
          {/* Add / Edit Form */}
          <div className="animate-slide-up" style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}>
            {!showForm ? (
              <button
                onClick={() => { setShowForm(true); setForm(emptyStructure); setEditingId(null); }}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Define Salary Structure
              </button>
            ) : (
              <form onSubmit={handleSaveStructure} className="card">
                <h3 className="text-sm font-semibold text-ink mb-4">
                  {editingId ? `Edit Salary — ${staffName(editingId)}` : "New Salary Structure"}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {!editingId && (
                    <select
                      className="select-field"
                      value={form.staff_id}
                      onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                      required
                    >
                      <option value="">Select Staff Member</option>
                      {unassignedStaff.map((s) => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.first_name} {s.last_name} ({s.role})
                        </option>
                      ))}
                    </select>
                  )}
                  <input className="input-field" type="number" placeholder="Base Salary (₹)" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} required min="0" step="0.01" />
                  <input className="input-field" type="number" placeholder="Transport Allowance (₹)" value={form.transport_allowance} onChange={(e) => setForm({ ...form, transport_allowance: e.target.value })} min="0" step="0.01" />
                  <input className="input-field" type="number" placeholder="Medical Allowance (₹)" value={form.medical_allowance} onChange={(e) => setForm({ ...form, medical_allowance: e.target.value })} min="0" step="0.01" />
                  <input className="input-field" type="number" placeholder="Other Allowances (₹)" value={form.other_allowances} onChange={(e) => setForm({ ...form, other_allowances: e.target.value })} min="0" step="0.01" />
                  <input className="input-field" type="number" placeholder="Standard Deductions (₹)" value={form.standard_deductions} onChange={(e) => setForm({ ...form, standard_deductions: e.target.value })} min="0" step="0.01" />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Save Structure</button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Structures Table */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
            {structures.length === 0 ? (
              <div className="card text-center py-16">
                <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-muted">No salary structures defined yet.</p>
                <p className="text-xs text-muted mt-1">Click "Define Salary Structure" to assign salaries to staff members.</p>
              </div>
            ) : (
              <>
                <Table columns={structColumns} data={pagedStructs} onSort={handleStructSort} sortConfig={structSortConfig} />
                <Pagination page={structPage} totalPages={structTotalPages} onPageChange={setStructPage} />
              </>
            )}
          </div>
        </>
      )}

      {/* ──────── TAB 3: DAILY WAGE TIMESHEET ──────── */}
      {tab === "daily" && (
        <>
          <div className="animate-slide-up" style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}>
            <div className="flex flex-wrap items-center gap-3">
              <input type="date" className="input-field !w-auto" value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} />
              <span className="text-muted text-sm">to</span>
              <input type="date" className="input-field !w-auto" value={dailyEnd} onChange={(e) => setDailyEnd(e.target.value)} />
              <button onClick={fetchDailyWages} className="btn-primary">Refresh Data</button>
            </div>
          </div>

          <div className="animate-slide-up mt-5" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
            {dailyWages.length === 0 ? (
              <div className="card text-center py-16">
                <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-muted">No daily wage records found.</p>
                <p className="text-xs text-muted mt-1">Ensure attendance is marked for daily wage staff in this date range.</p>
              </div>
            ) : (
              <Table columns={dailyColumns} data={dailyWages} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
