import { useEffect, useMemo, useState } from "react";

import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import Table from "../components/Table.jsx";
import ReceiptPrint from "../components/ReceiptPrint.jsx";
import useAutoSave from "../hooks/useAutoSave.js";
import { formatDate } from "../utils/dateFormatter.js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const statusBadge = {
  paid: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  partial: "bg-blue-500/15 text-blue-700 border border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  pending: "bg-amber-500/15 text-amber-700 border border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  overdue: "bg-red-500/15 text-red-700 border border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  "no fees": "bg-slate-500/15 text-slate-700 border border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
};

const FEE_TYPES = ["Tuition", "Lab", "Library", "Sports", "Transport"];
const PAY_MODES = ["Cash", "UPI", "Net Banking", "Cheque", "Card"];

const emptyPayment = {
  fee_type: "",
  amount: "",
  payment_date: "",
  mode: "",
  receipt_number: "",
  transaction_no: "",
  remarks: "",
};

export default function Fees() {
  // ── State ───────────────────────────────────────────
  const [tab, setTab] = useState("overview"); // "overview" | "history"
  const [overview, setOverview] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm, clearPayForm] = useAutoSave("fees_pay_form_draft", emptyPayment);
  const [showPayForm, setShowPayForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [histSortConfig, setHistSortConfig] = useState({ key: null, direction: 'asc' });
  const pageSize = 10;

  // ── Data Fetching ─────────────────────────────────────
  const fetchOverview = async () => {
    const [ovRes, clRes] = await Promise.all([
      api.get("/fees/overview"),
      api.get("/classes"),
    ]);
    setOverview(ovRes.data);
    setClasses(clRes.data);
  };

  const fetchPayments = async (studentId) => {
    const res = await api.get(`/fees/payments/by-student/${studentId}`);
    setPayments(res.data);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedStudent && tab === "history") {
      fetchPayments(selectedStudent.student_id);
    }
  }, [selectedStudent, tab]);

  // ── Overview Filtering ────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return overview.filter((row) => {
      if (filterClass && String(row.class_id) !== filterClass) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      if (term) {
        const searchable = `${row.student_id} ${row.student_name} ${row.class_name}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [overview, search, filterClass, filterStatus]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleHistSort = (key) => {
    let direction = 'asc';
    if (histSortConfig.key === key && histSortConfig.direction === 'asc') direction = 'desc';
    setHistSortConfig({ key, direction });
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

  const sortedPayments = useMemo(() => {
    if (!histSortConfig.key) return payments;
    return [...payments].sort((a, b) => {
      let aVal = a[histSortConfig.key];
      let bVal = b[histSortConfig.key];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || "").toLowerCase(); }
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      if (aVal < bVal) return histSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return histSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, histSortConfig]);

  useEffect(() => { setPage(1); }, [search, filterClass, filterStatus, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));
  const paged = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  const histTotalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const histPaged = sortedPayments.slice((histPage - 1) * pageSize, histPage * pageSize);

  // ── Overview Summaries ────────────────────────────────
  const summaryStats = useMemo(() => {
    const total = overview.reduce((s, r) => s + r.total_fees, 0);
    const paid = overview.reduce((s, r) => s + r.total_paid, 0);
    const balance = overview.reduce((s, r) => s + r.balance, 0);
    const overdue = overview.filter((r) => r.status === "pending" || r.status === "partial").length;
    return { total, paid, balance, overdue };
  }, [overview]);

  // ── Handlers ──────────────────────────────────────────
  const handleStudentClick = (row) => {
    setSelectedStudent(row);
    setTab("history");
    setHistPage(1);
    // fetchPayments is now handled by the useEffect watching selectedStudent and tab
  };

  const handleBackToOverview = () => {
    setTab("overview");
    setSelectedStudent(null);
    setPayments([]);
    setShowPayForm(false);
    clearPayForm();
    fetchOverview(); // refresh totals
  };

  const handleOpenPayForm = async () => {
    setShowPayForm(true);
    try {
      const res = await api.get("/fees/payments/next-receipt");
      setPayForm({ ...emptyPayment, receipt_number: res.data.receipt_number });
    } catch (err) {
      console.error("Failed to fetch next receipt", err);
      setPayForm({ ...emptyPayment, receipt_number: "Auto-generated" });
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const res = await api.post(`/fees/payments/by-student/${selectedStudent.student_id}`, {
      ...payForm,
      student_id: selectedStudent.student_id,
      amount: Number(payForm.amount),
    });
    clearPayForm();
    setShowPayForm(false);

    if (res?.offline) {
      return;
    }

    await fetchPayments(selectedStudent.student_id);
    // Refresh overview totals in background
    const ovRes = await api.get("/fees/overview");
    setOverview(ovRes.data);
    const updated = ovRes.data.find((r) => r.student_id === selectedStudent.student_id);
    if (updated) setSelectedStudent(updated);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm("Delete this payment record?")) return;
    await api.delete(`/fees/payments/${paymentId}`);
    await fetchPayments(selectedStudent.student_id);
    const ovRes = await api.get("/fees/overview");
    setOverview(ovRes.data);
    const updated = ovRes.data.find((r) => r.student_id === selectedStudent.student_id);
    if (updated) setSelectedStudent(updated);
  };

  const clearFilters = () => { setSearch(""); setFilterClass(""); setFilterStatus(""); };
  const hasActiveFilters = search || filterClass || filterStatus;

  // ── Overview Columns ──────────────────────────────────
  const overviewColumns = [
    { key: "student_name", label: "Student" },
    {
      key: "class_name", label: "Class",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          {row.class_name}
        </span>
      ),
    },
    {
      key: "total_fees", label: "Total Fees",
      render: (row) => <span className="font-mono text-sm">₹{row.total_fees.toLocaleString("en-IN")}</span>,
    },
    {
      key: "total_paid", label: "Paid",
      render: (row) => <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">₹{row.total_paid.toLocaleString("en-IN")}</span>,
    },
    {
      key: "balance", label: "Balance",
      render: (row) => (
        <span className={`font-mono text-sm font-semibold ${row.balance > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
          ₹{row.balance.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "payment_count", label: "Payments",
      render: (row) => <span className="text-xs text-muted">{row.payment_count}</span>,
    },
    {
      key: "status", label: "Status",
      render: (row) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[row.status] || ""}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions", label: "",
      render: (row) => (
        <button
          onClick={() => handleStudentClick(row)}
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
        >
          View
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      ),
    },
  ];

  // ── Payment History Columns ───────────────────────────
  const paymentColumns = [
    { key: "payment_date", label: "Date", render: (row) => formatDate(row.payment_date) },
    {
      key: "fee_type", label: "Fee Type",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
          {row.fee_type}
        </span>
      ),
    },
    {
      key: "amount", label: "Amount",
      render: (row) => <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">₹{row.amount.toLocaleString("en-IN")}</span>,
    },
    {
      key: "mode", label: "Mode",
      render: (row) => <span className="text-xs">{row.mode}</span>,
    },
    { key: "receipt_number", label: "Receipt No." },
    { key: "transaction_no", label: "Transaction No." },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            onClick={() => window.printReceipt(row, selectedStudent)}
          >
            Print
          </button>
          <button
            className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
            onClick={() => handleDeletePayment(row.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  // ── Chart Helpers ─────────────────────────────────────
  // Calculate total paid dynamically from the live payments table
  const dynamicTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const dynamicBalance = selectedStudent ? Math.max(0, selectedStudent.total_fees - dynamicTotalPaid) : 0;

  const paymentChartData = selectedStudent ? [
    { name: 'Paid', value: dynamicTotalPaid, color: '#10b981' },
    { name: 'Balance', value: dynamicBalance, color: '#ef4444' }
  ].filter(d => d.value > 0) : [];

  const structureChartData = selectedStudent ? [
    { name: 'Tuition', value: selectedStudent.base_fee || 0, color: '#6366f1' },
    { name: 'Admission & Exam', value: selectedStudent.other_fee || 0, color: '#f59e0b' },
    { name: 'Transport', value: selectedStudent.transport_fee || 0, color: '#06b6d4' }
  ].filter(d => d.value > 0) : [];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg text-sm z-50">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{payload[0].name}</p>
          <p className="font-mono font-bold" style={{ color: payload[0].payload.color }}>
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <div className="page-header mb-1">
          <div className="page-icon">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink">Fees</h1>
            <p className="text-sm text-muted">Track student fee collection and payment history.</p>
          </div>
        </div>
      </div>

      {/* ────────────── TAB 1: OVERVIEW ────────────── */}
      {tab === "overview" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "80ms", opacity: 0, animationFillMode: "forwards" }}>
            <div className="card !py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Total Fees</p>
              <p className="text-xl font-bold font-mono text-ink">₹{summaryStats.total.toLocaleString("en-IN")}</p>
            </div>
            <div className="card !py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Collected</p>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">₹{summaryStats.paid.toLocaleString("en-IN")}</p>
            </div>
            <div className="card !py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Outstanding</p>
              <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400">₹{summaryStats.balance.toLocaleString("en-IN")}</p>
            </div>
            <div className="card !py-4 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Pending Students</p>
              <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{summaryStats.overdue}</p>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="animate-slide-up" style={{ animationDelay: "160ms", opacity: 0, animationFillMode: "forwards" }}>
            <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-primary-300 dark:focus-within:border-primary-600">
              <div className="pointer-events-none flex items-center pl-4">
                <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                className="flex-1 min-w-0 bg-transparent border-none outline-none py-2.5 px-3 text-sm text-ink placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Search by student name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <select
                className="bg-transparent border-none outline-none text-xs font-medium text-slate-600 dark:text-slate-300 py-2 pl-3 pr-6 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors appearance-none"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>{cls.name} {cls.section}</option>
                ))}
              </select>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <select
                className="bg-transparent border-none outline-none text-xs font-medium text-slate-600 dark:text-slate-300 py-2 pl-3 pr-6 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
              {hasActiveFilters && (
                <>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center justify-center px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear filters"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
              <div className="flex-shrink-0 pr-3 pl-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  {filtered.length}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="animate-slide-up" style={{ animationDelay: "240ms", opacity: 0, animationFillMode: "forwards" }}>
            <Table columns={overviewColumns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* ────────────── TAB 2: PAYMENT HISTORY ────────────── */}
      {tab === "history" && selectedStudent && (
        <>
          {/* Back button + Student Header */}
          <div className="animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleBackToOverview}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Back to Overview
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/pay/${selectedStudent.student_id}`;
                  navigator.clipboard.writeText(url);
                  alert("Parent Payment Link copied to clipboard! Open in Incognito to demo.");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Copy Parent Portal Link
              </button>
            </div>

            <div className="card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Student Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-heading font-bold text-ink">{selectedStudent.student_name}</h2>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[selectedStudent.status] || ""}`}>
                      {selectedStudent.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted mb-4">{selectedStudent.class_name} • Student ID: {selectedStudent.student_id}</p>
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Total Due: <span className="font-mono text-sm text-ink ml-1">₹{selectedStudent.total_fees.toLocaleString("en-IN")}</span>
                  </p>
                </div>

                {/* Charts */}
                <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto h-48">
                  {/* Chart 1: Fee Structure */}
                  <div className="flex-1 min-w-[200px] h-full flex flex-col items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fee Structure</h3>
                    <div className="w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={structureChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {structureChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 h-full"></div>

                  {/* Chart 2: Collection Status */}
                  <div className="flex-1 min-w-[200px] h-full flex flex-col items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Collection Status</h3>
                    <div className="w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {paymentChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Add Payment Button / Form */}
          <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
            {!showPayForm ? (
              <button
                onClick={handleOpenPayForm}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Record Payment
              </button>
            ) : (
              <form onSubmit={handlePaySubmit} className="card">
                <h3 className="text-sm font-semibold text-ink mb-4">Record New Payment</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <select className="select-field" value={payForm.fee_type} onChange={(e) => setPayForm({ ...payForm, fee_type: e.target.value })} required>
                    <option value="">Fee Type</option>
                    {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className="input-field" placeholder="Amount" type="number" step="0.01" min="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required title="Must be greater than 0" />
                  <input className="input-field" type="date" value={payForm.payment_date} onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })} required />
                  <select className="select-field" value={payForm.mode} onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })} required>
                    <option value="">Payment Mode</option>
                    {PAY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input className="input-field bg-slate-50 text-slate-500 cursor-not-allowed" placeholder="Receipt Number (Auto)" value={payForm.receipt_number} readOnly title="Auto-generated receipt number" />
                  <input className="input-field" placeholder="Transaction No." value={payForm.transaction_no || ""} onChange={(e) => setPayForm({ ...payForm, transaction_no: e.target.value })} required={!["Cash", "Cheque"].includes(payForm.mode)} disabled={["Cash", "Cheque"].includes(payForm.mode)} minLength={5} maxLength={50} title="5–50 characters" />
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Save Payment</button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowPayForm(false); clearPayForm(); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Payment History Table */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
            {payments.length === 0 ? (
              <div className="card text-center py-12">
                <svg className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18v-.008zm-12 0h.008v.008H6v-.008z" />
                </svg>
                <p className="text-sm text-muted">No payments recorded yet.</p>
                <p className="text-xs text-muted mt-1">Click "Record Payment" to add the first transaction.</p>
              </div>
            ) : (
              <>
                <Table columns={paymentColumns} data={histPaged} onSort={handleHistSort} sortConfig={histSortConfig} />
                <Pagination page={histPage} totalPages={histTotalPages} onPageChange={setHistPage} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
