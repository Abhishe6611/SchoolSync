import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import CountUp from "../components/CountUp";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function DonutChart({ male, female, other }) {
  const [mounted, setMounted] = useState(false);
  const total = male + female + other;
  
  useEffect(() => {
    if (total > 0) {
      const timer = setTimeout(() => setMounted(true), 150);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [total]);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-[#adb5bd]">No student data yet.</p>
      </div>
    );
  }

  const malePct = total > 0 ? (male / total) * 100 : 0;
  const femalePct = total > 0 ? (female / total) * 100 : 0;
  const otherPct = total > 0 ? (other / total) * 100 : 0;
  
  const radius = 15.9155;
  const circumference = 100;
  const strokeWidth = 5;
  const desiredVisualGap = 2; // small aesthetic gap
  const gap = strokeWidth + desiredVisualGap; // compensate for round linecaps
  
  const activeCount = [male, female, other].filter((v) => v > 0).length;
  const totalGap = activeCount > 1 ? gap * activeCount : 0;
  const avail = circumference - totalGap;

  const maleLen = male > 0 ? (malePct / 100) * avail : 0;
  const femaleLen = female > 0 ? (femalePct / 100) * avail : 0;
  const otherLen = other > 0 ? (otherPct / 100) * avail : 0;

  let currentOffset = 0;
  const maleOffset = currentOffset;
  if (male > 0) currentOffset += maleLen + gap;
  const femaleOffset = currentOffset;
  if (female > 0) currentOffset += femaleLen + gap;
  const otherOffset = currentOffset;

  return (
    <div className="flex items-center gap-8">
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 42 42" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#4263eb" strokeWidth="5" strokeDasharray={`${mounted ? maleLen : 0} ${circumference}`} strokeDashoffset={-maleOffset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: mounted ? 1 : 0 }} />
          {female > 0 && (
            <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#f06595" strokeWidth="5" strokeDasharray={`${mounted ? femaleLen : 0} ${circumference}`} strokeDashoffset={-femaleOffset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: mounted ? 1 : 0 }} />
          )}
          {other > 0 && (
            <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#adb5bd" strokeWidth="5" strokeDasharray={`${mounted ? otherLen : 0} ${circumference}`} strokeDashoffset={-otherOffset} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: mounted ? 1 : 0 }} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-heading font-bold text-[#212529]">
            <CountUp end={total} duration={1200} />
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[#868e96]">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4263eb" }} />
          <div>
            <p className="text-sm font-semibold text-[#212529]">{male}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#868e96]">Male · {malePct.toFixed(1)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f06595" }} />
          <div>
            <p className="text-sm font-semibold text-[#212529]">{female}</p>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#868e96]">Female · {femalePct.toFixed(1)}%</p>
          </div>
        </div>
        {other > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#adb5bd" }} />
            <div>
              <p className="text-sm font-semibold text-[#212529]">{other}</p>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#868e96]">Other · {otherPct.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat icons ── */
const feeStatusIcons = {
  pending: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  paid: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  overdue: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  partial: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" /></svg>,
};

const feeStatusColors = {
  pending: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-400" },
  paid: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-400" },
  overdue: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-400", bar: "bg-red-400" },
  partial: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", bar: "bg-blue-400" },
};
const defaultFeeColors = { bg: "bg-slate-50", text: "text-slate-700", bar: "bg-slate-400" };

export default function Dashboard() {
  const [feeSummary, setFeeSummary] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [barsMounted, setBarsMounted] = useState(false);

  useEffect(() => {
    if (feeSummary.length > 0) {
      const timer = setTimeout(() => setBarsMounted(true), 250);
      return () => clearTimeout(timer);
    } else {
      setBarsMounted(false);
    }
  }, [feeSummary]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [feeRes, studRes, staffRes, classRes, subRes] = await Promise.allSettled([
          api.get("/reports/fees"),
          api.get("/students"),
          api.get("/staff"),
          api.get("/classes"),
          api.get("/subjects"),
        ]);
        if (feeRes.status === "fulfilled") setFeeSummary(feeRes.value.data);
        if (studRes.status === "fulfilled") setStudents(studRes.value.data);
        if (staffRes.status === "fulfilled") setStaffList(staffRes.value.data);
        if (classRes.status === "fulfilled") setClasses(classRes.value.data);
        if (subRes.status === "fulfilled") setSubjects(subRes.value.data);
      } catch {
        /* silent */
      }
    };
    fetchAll();
  }, []);

  const genderData = useMemo(() => {
    let male = 0, female = 0, other = 0;
    students.forEach((s) => {
      const g = (s.gender || "").toLowerCase().trim();
      if (g === "male") male++;
      else if (g === "female") female++;
      else other++;
    });
    return { male, female, other };
  }, [students]);

  /* HRISELINK-style stat cards config */
  const quickStats = [
    {
      label: "Total Students",
      value: students.length,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      iconBg: "#212529",
    },
    {
      label: "Total Staff",
      value: staffList.length,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      ),
      iconBg: "#212529",
    },
    {
      label: "Total Classes",
      value: classes.length,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
      ),
      iconBg: "#212529",
    },
    {
      label: "Total Subjects",
      value: subjects.length,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
      iconBg: "#212529",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-xl font-heading font-bold text-[#212529]">{getGreeting()}</h1>
        <p className="text-[13px] text-[#868e96] mt-0.5">Here&apos;s your school overview for today.</p>
      </div>

      {/* Stat Cards — HRISELINK style */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, idx) => (
          <div
            key={stat.label}
            className="card animate-slide-up group"
            style={{ animationDelay: `${idx * 60}ms`, opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white flex-shrink-0"
                style={{ backgroundColor: stat.iconBg }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-3xl font-heading font-bold text-[#212529]">
                  <CountUp end={stat.value} duration={1200} />
                </p>
                <p className="text-[11px] text-[#868e96] font-medium mt-0.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gender + Fee Overview */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gender Distribution */}
        <div
          className="card animate-slide-up"
          style={{ animationDelay: "280ms", opacity: 0, animationFillMode: "forwards" }}
        >
          <h3 className="text-sm font-semibold text-[#212529] mb-5">Gender Distribution</h3>
          <DonutChart male={genderData.male} female={genderData.female} other={genderData.other} />
        </div>

        {/* Fee Overview */}
        <div
          className="card animate-slide-up"
          style={{ animationDelay: "340ms", opacity: 0, animationFillMode: "forwards" }}
        >
          <h3 className="text-sm font-semibold text-[#212529] mb-5">Fee Overview</h3>
          {feeSummary.length > 0 ? (
            <div className="space-y-3">
              {feeSummary.map((item) => {
                const status = item.status?.toLowerCase();
                const colors = feeStatusColors[status] || defaultFeeColors;
                const icon = feeStatusIcons[status] || feeStatusIcons.pending;
                const paidPct = item.total_amount > 0 ? Math.round((item.total_paid / item.total_amount) * 100) : 0;

                return (
                  <div key={item.status} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${colors.bg} ${colors.text}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#495057] capitalize">{item.status}</span>
                        <span className="text-sm font-bold text-[#212529]">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#f1f3f5] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors.bar}`}
                          style={{ 
                            width: barsMounted ? `${paidPct}%` : "0%",
                            transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[#adb5bd]">
                        <span>₹{item.total_paid.toFixed(0)}</span>
                        <span>₹{item.total_amount.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f1f3f5] mb-3">
                <svg className="h-6 w-6 text-[#ced4da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#868e96]">No fee data available yet.</p>
              <p className="text-xs text-[#adb5bd] mt-1">Data appears once fee records are added.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
