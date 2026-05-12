import { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Brush } from "recharts";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler,
  zoomPlugin
);

const statusColors = {
  pending: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-l-amber-400", bar: "bg-amber-400" },
  paid: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-l-emerald-400", bar: "bg-emerald-400" },
  overdue: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-400", border: "border-l-red-400", bar: "bg-red-400" },
  partial: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", border: "border-l-blue-400", bar: "bg-blue-400" },
};
const defaultC = { bg: "bg-[#f1f3f5]", text: "text-[#495057]", border: "border-l-[#adb5bd]", bar: "bg-[#adb5bd]" };

const attColors = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-l-emerald-400",
  absent: "bg-red-500/15 text-red-700 dark:text-red-400 border-l-red-400",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-l-amber-400",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-l-blue-400",
};

const PIE_COLORS = ['#4263eb', '#f59f00', '#2b8a3e', '#e64980', '#15aabf', '#7950f2', '#fab005', '#12b886'];

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("financial"); // financial, demographics, attendance

  // Base Data
  const [classes, setClasses] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(null);

  // Chart State
  const chartContainerRef = useRef(null);
  const [chartMode, setChartMode] = useState("daily"); // daily | monthly

  // Fee Details Modal State
  const [selectedStatusMode, setSelectedStatusMode] = useState(null); // 'paid', 'pending', 'partial'
  const [feeOverviewData, setFeeOverviewData] = useState([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  // Attendance states
  const [attType, setAttType] = useState("student"); // student | staff
  const [classId, setClassId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [cRes, fRes, dRes] = await Promise.all([
          api.get("/classes"),
          api.get("/reports/fees"),
          api.get("/reports/dashboard")
        ]);
        setClasses(cRes.data);
        setFeeSummary(fRes.data);
        setDashboard(dRes.data);
      } catch (err) {
        console.error("Failed to fetch report data", err);
      }
    };
    fetchBase();
    api.get("/admin/school-settings").then(r => setSchoolSettings(r.data)).catch(() => { });
  }, []);

  const loadAttendance = async () => {
    if (!start || !end) return;
    try {
      if (attType === "student") {
        if (!classId) return alert("Please select a class for student attendance.");
        const res = await api.get("/reports/attendance", { params: { class_id: classId, start, end } });
        setAttendance(res.data);
      } else {
        const res = await api.get("/reports/staff-attendance", { params: { start, end } });
        setAttendance(res.data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load attendance report.");
    }
  };

  const openFeeDetails = async (status) => {
    setSelectedStatusMode(status);
    setIsFetchingDetails(true);
    setSearchName("");
    setSelectedClass("");
    try {
      const res = await api.get("/fees/overview");
      setFeeOverviewData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load fee details.");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 shadow-lg rounded-xl">
          <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── School Branding Header ── */}
      <div className="animate-slide-up">
        <div className="card !p-0 overflow-hidden mb-6">
          <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", color: "#fff", padding: "18px 28px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: "2px solid rgba(255,255,255,0.15)" }}>
              {schoolSettings?.logo_url ? (
                <img src={`${API_BASE}${schoolSettings.logo_url}`} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: "17px", fontWeight: 800, letterSpacing: "0.3px" }}>{schoolSettings?.school_name || "SchoolSync Academy"}</h1>
              <p style={{ margin: "2px 0 0", fontSize: "11px", opacity: 0.7 }}>{schoolSettings?.address || ""}</p>
            </div>
            <div style={{ textAlign: "right", fontSize: "10px", opacity: 0.6 }}>
              <p style={{ margin: 0 }}>Reg: {schoolSettings?.registration_no || ""}</p>
              <p style={{ margin: "2px 0 0" }}>{schoolSettings?.phone || ""}</p>
            </div>
          </div>
        </div>
        <h1 className="page-title">Analytics & Reports</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Comprehensive insights across financials, enrollments, and compliance.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-0 border-b animate-slide-up" style={{ borderColor: "var(--color-border)", animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <button type="button" onClick={() => setActiveTab("financial")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "financial" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Financial Analytics
        </button>
        <button type="button" onClick={() => setActiveTab("demographics")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "demographics" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Demographics & Enrollment
        </button>
        <button type="button" onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px ${activeTab === "attendance" ? "border-[#212529] text-[#212529]" : "border-transparent text-[#868e96] hover:text-[#495057]"}`}>
          Attendance & Compliance
        </button>
      </div>

      {/* ──────────────── TAB 1: FINANCIAL ANALYTICS ──────────────── */}
      {activeTab === "financial" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>

          {/* Revenue Area Chart */}
          <div
            className="card h-[450px] relative group flex flex-col shadow-sm border border-slate-100 dark:border-slate-800"
            ref={chartContainerRef}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base font-bold text-[#212529] dark:text-slate-800">
                  Fee Collection Trend
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Daily and monthly revenue overview</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 font-medium">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Hold <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded text-[10px] font-bold shadow-sm mx-0.5 text-slate-700 dark:text-slate-300">Ctrl</kbd> + Scroll to zoom
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex">
                  <button
                    onClick={() => setChartMode("daily")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartMode === "daily" ? "bg-white dark:bg-slate-700 text-[#212529] dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartMode("monthly")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${chartMode === "monthly" ? "bg-white dark:bg-slate-700 text-[#212529] dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0 relative">
              {(() => {
                const fullData = chartMode === "monthly" ? dashboard?.fee_collection_trend : dashboard?.daily_fee_collection_trend;
                if (!fullData?.length) return <div className="flex h-full items-center justify-center text-sm text-slate-400 font-medium">No revenue data available.</div>;

                const labels = fullData.map(d => chartMode === "monthly" ? d.month : d.date);
                const dataValues = fullData.map(d => d.amount);

                // Helper: recalculate Y-axis bounds based on visible X range
                const adjustYAxis = (chart) => {
                  const xScale = chart.scales.x;
                  const dataset = chart.data.datasets[0].data;
                  // Include 1 adjacent point on each side so connecting lines stay visible
                  const minIndex = Math.max(0, Math.floor(xScale.min) - 1);
                  const maxIndex = Math.min(dataset.length - 1, Math.ceil(xScale.max) + 1);
                  const visibleSlice = dataset.slice(minIndex, maxIndex + 1);
                  if (visibleSlice.length === 0) return;
                  const yMin = Math.min(...visibleSlice);
                  const yMax = Math.max(...visibleSlice);
                  const padding = (yMax - yMin) * 0.15 || yMax * 0.1 || 100;
                  chart.options.scales.y.min = Math.max(0, Math.floor(yMin - padding));
                  chart.options.scales.y.max = Math.ceil(yMax + padding);
                  chart.update('none');
                };

                // Helper: reset Y-axis to auto
                const resetYAxis = (chart) => {
                  chart.options.scales.y.min = undefined;
                  chart.options.scales.y.max = undefined;
                  chart.update('none');
                };

                const data = {
                  labels,
                  datasets: [
                    {
                      label: 'Revenue Collected',
                      data: dataValues,
                      borderColor: '#10b981',
                      borderWidth: 3,
                      fill: true,
                      backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'rgba(16, 185, 129, 0.1)';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                        gradient.addColorStop(0.6, 'rgba(16, 185, 129, 0.05)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        return gradient;
                      },
                      pointBackgroundColor: '#ffffff',
                      pointBorderColor: '#10b981',
                      pointBorderWidth: 2,
                      pointRadius: dataValues.length <= 20 ? 5 : 0,
                      pointHoverRadius: 7,
                      pointHoverBackgroundColor: '#10b981',
                      pointHoverBorderColor: '#ffffff',
                      pointHoverBorderWidth: 3,
                      tension: dataValues.length <= 5 ? 0 : 0.3,
                    }
                  ]
                };

                const options = {
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: {
                    padding: { top: 10, bottom: 0, left: -5, right: 10 }
                  },
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleColor: '#e2e8f0',
                      bodyColor: '#34d399',
                      bodyFont: { size: 14, weight: 'bold' },
                      titleFont: { size: 12, weight: 'normal' },
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: false,
                      callbacks: {
                        label: (context) => `Revenue: ₹${context.raw.toLocaleString('en-IN')}`,
                        title: (items) => `${chartMode === 'daily' ? 'Date' : 'Month'}: ${items[0].label}`
                      }
                    },
                    zoom: {
                      limits: {
                        x: { minRange: 2 },
                      },
                      pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: 'ctrl',
                        onPanComplete: ({ chart }) => adjustYAxis(chart),
                      },
                      zoom: {
                        wheel: {
                          enabled: true,
                          modifierKey: 'ctrl',
                        },
                        pinch: { enabled: true },
                        mode: 'x',
                        onZoomComplete: ({ chart }) => adjustYAxis(chart),
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                        drawBorder: false,
                      },
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                        color: '#94a3b8',
                        font: { size: 11, weight: '500' },
                        padding: 8
                      },
                      border: { display: false }
                    },
                    y: {
                      grid: {
                        color: 'rgba(226, 232, 240, 0.5)',
                        drawBorder: false,
                        borderDash: [4, 4]
                      },
                      ticks: {
                        color: '#94a3b8',
                        font: { size: 11, weight: '500' },
                        padding: 12,
                        callback: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`
                      },
                      border: { display: false }
                    }
                  }
                };

                return (
                  <div className="relative w-full h-full">
                    <Line
                      data={data}
                      options={options}
                      ref={(ref) => {
                        if (ref) window.__feeChart = ref;
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (window.__feeChart) {
                          window.__feeChart.resetZoom();
                          resetYAxis(window.__feeChart);
                        }
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-all opacity-70 hover:opacity-100 flex items-center gap-1.5 shadow-sm border border-slate-200 dark:border-slate-700"
                      title="Reset Zoom"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                      Reset
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Fee Status Summary Cards */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#212529]">Fee Collection Status</h2>
              <ImportExportToolbar
                data={feeSummary}
                columns={[
                  { key: "status", label: "Status" },
                  { key: "count", label: "Records Count" },
                  { key: "total_amount", label: "Total Amount" },
                  { key: "total_paid", label: "Total Paid" }
                ]}
                filename="Fee_Summary_Report"
                showImport={false}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {feeSummary.map((item, idx) => {
                const key = item.status?.toLowerCase();
                const c = statusColors[key] || defaultC;
                const pct = item.total_amount > 0 ? Math.round((item.total_paid / item.total_amount) * 100) : 0;
                return (
                  <div key={item.status} className={`rounded-xl border-l-4 ${c.border} p-5 ${c.bg}`}>
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${c.text} opacity-80`}>{item.status}</div>
                    <div className={`text-2xl font-heading font-bold mt-1 ${c.text}`}>{item.count} <span className="text-sm font-normal opacity-70">records</span></div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold opacity-70">
                        <span>Paid: ₹{item.total_paid.toLocaleString('en-IN')}</span>
                        <span>Total: ₹{item.total_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                        <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 pt-2 border-t border-black/5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openFeeDetails(item.status)}
                          className={`text-[10px] font-bold uppercase tracking-wider ${c.text} hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1`}
                        >
                          View Details
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 2: DEMOGRAPHICS ──────────────── */}
      {activeTab === "demographics" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Admissions Trend */}
            <div className="card h-80 flex flex-col">
              <h2 className="text-sm font-semibold text-[#212529] mb-4">New Admissions (Monthly)</h2>
              <div className="flex-1">
                {dashboard?.admissions_trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.admissions_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Admissions" fill="#4263eb" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No admissions data available.</div>
                )}
              </div>
            </div>

            {/* Staff Distribution Donut */}
            <div className="card h-80 flex flex-col">
              <h2 className="text-sm font-semibold text-[#212529] mb-4">Staff Roles Distribution</h2>
              <div className="flex-1 flex justify-center">
                {dashboard?.staff_distribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboard.staff_distribution}
                        cx="50%" cy="45%"
                        innerRadius={60} outerRadius={90}
                        paddingAngle={2}
                        dataKey="count" nameKey="role"
                        stroke="none"
                      >
                        {dashboard.staff_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#475569' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No staff data available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Student Class Distribution */}
          <div className="card h-96">
            <h2 className="text-sm font-semibold text-[#212529] mb-4">Student Population per Class</h2>
            {dashboard?.student_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.student_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="class_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total Students" fill="#f59f00" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No class distribution data available.</div>
            )}
          </div>

        </div>
      )}

      {/* ──────────────── TAB 3: ATTENDANCE ──────────────── */}
      {activeTab === "attendance" && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#212529]">Attendance Query Builder</h2>
              {attendance && attendance.records && (
                <ImportExportToolbar
                  data={attendance.records}
                  columns={
                    attType === "student"
                      ? [
                        { key: "student_name", label: "Student Name" },
                        { key: "date", label: "Date" },
                        { key: "status", label: "Status" },
                        { key: "remarks", label: "Remarks" }
                      ]
                      : [
                        { key: "staff_name", label: "Staff Name" },
                        { key: "date", label: "Date" },
                        { key: "status", label: "Status" },
                        { key: "remarks", label: "Remarks" }
                      ]
                  }
                  filename={`${attType.toUpperCase()}_Attendance_Sheet_${start}_to_${end}`}
                  showImport={false}
                />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-5 items-end">
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1">Target Group</label>
                <select className="select-field" value={attType} onChange={(e) => { setAttType(e.target.value); setAttendance(null); }}>
                  <option value="student">Students (Per Class)</option>
                  <option value="staff">All Staff</option>
                </select>
              </div>

              {attType === "student" && (
                <div>
                  <label className="block text-xs font-semibold text-[#495057] mb-1">Class</label>
                  <select className="select-field" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1">Start Date</label>
                <input className="input-field" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1">End Date</label>
                <input className="input-field" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>

              <button type="button" className="btn-primary py-2.5 h-[42px]" onClick={loadAttendance}>Generate Report</button>
            </div>

            {attendance && (
              <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
                <h3 className="text-sm font-bold text-[#212529] mb-4">
                  Results for {attType === "student" ? `Class ${classes.find(c => String(c.id) === classId)?.name || ''}` : "All Staff"}
                  <span className="font-normal text-[#868e96] ml-2">({start} to {end})</span>
                </h3>

                {Object.keys(attendance.totals).length > 0 ? (
                  attType === "student" ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      {Object.entries(attendance.totals).map(([status, count], idx) => {
                        const cls = attColors[status] || "bg-[#f1f3f5] text-[#495057] border-l-[#adb5bd]";
                        return (
                          <div key={status} className={`rounded-xl border-l-4 p-4 ${cls} animate-slide-up`} style={{ animationDelay: `${idx * 80}ms`, opacity: 0, animationFillMode: "forwards" }}>
                            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{status}</div>
                            <div className="text-3xl font-heading font-bold mt-1">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-1 max-w-lg mx-auto">
                      {(() => {
                        const present = attendance.totals["present"] || 0;
                        const total = Object.values(attendance.totals).reduce((sum, count) => sum + count, 0);
                        const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="rounded-xl border-l-4 border-l-emerald-400 p-8 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 animate-slide-up text-center shadow-sm">
                            <div className="text-[13px] font-bold uppercase tracking-wider opacity-80 mb-2">Percentage of Teachers Present</div>
                            <div className="text-5xl font-heading font-bold">{percentage}%</div>
                            <div className="text-sm mt-3 opacity-80 font-medium">({present} out of {total} total attendance records)</div>
                          </div>
                        );
                      })()}
                    </div>
                  )
                ) : (
                  <div className="bg-[#f8f9fa] rounded-xl p-8 text-center text-sm text-[#868e96]">
                    No attendance records found for the selected criteria.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── FEE DETAILS MODAL ──────────────── */}
      {selectedStatusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 sm:p-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-heading font-bold text-[#212529] dark:text-slate-100 capitalize">
                {selectedStatusMode} Fee Details
              </h3>
              <button type="button" onClick={() => setSelectedStatusMode(null)} className="p-2 -mr-2 text-[#adb5bd] hover:text-[#495057] dark:hover:text-slate-300 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 bg-[#f8f9fa] dark:bg-slate-800/50 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#495057] dark:text-slate-300 mb-1">Search by Alphabet/Name</label>
                  <input type="text" className="input-field dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600 dark:placeholder-slate-400" placeholder="Search student..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
                </div>
                <div className="w-64">
                  <label className="block text-xs font-semibold text-[#495057] dark:text-slate-300 mb-1">Filter by Class</label>
                  <select className="select-field dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    <option value="">All Classes</option>
                    {classes.map((c) => <option key={c.id} value={`${c.name} ${c.section}`}>{c.name} {c.section}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0 min-h-[300px]">
              {isFetchingDetails ? (
                <div className="flex h-full items-center justify-center text-[#868e96]">Loading details...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white dark:bg-slate-800 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                    <tr>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] dark:text-slate-400">Student Name</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] dark:text-slate-400">Class</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] dark:text-slate-400 text-right">Total Fee</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] dark:text-slate-400 text-right">Paid Amount</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] dark:text-slate-400 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {(() => {
                      const filtered = feeOverviewData.filter(item => {
                        if (item.status.toLowerCase() !== selectedStatusMode.toLowerCase()) return false;
                        if (searchName && !item.student_name.toLowerCase().includes(searchName.toLowerCase())) return false;
                        if (selectedClass && item.class_name !== selectedClass) return false;
                        return true;
                      });

                      if (filtered.length === 0) return <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-[#868e96]">No matching records found.</td></tr>;

                      return filtered.map((row) => (
                        <tr key={row.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-6 py-3.5 text-[13px] font-semibold text-[#212529] group-hover:text-[#4263eb] dark:text-slate-200 dark:group-hover:text-indigo-400 transition-colors">{row.student_name}</td>
                          <td className="px-6 py-3.5 text-[13px] text-[#495057] dark:text-slate-300">{row.class_name}</td>
                          <td className="px-6 py-3.5 text-[13px] font-medium text-[#212529] dark:text-slate-200 text-right">₹{row.total_fees.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400 text-right">₹{row.total_paid.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3.5 text-[13px] font-bold text-red-500 dark:text-red-400 text-right">₹{row.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
