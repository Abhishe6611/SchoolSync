import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/axios";

export default function TeacherSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [myAttendance, setMyAttendance] = useState(null);

  useEffect(() => {
    if (user?.staff_id) {
      api.get(`/staff-attendance/my-percentage?staff_id=${user.staff_id}`)
         .then(res => setMyAttendance(res.data.percentage))
         .catch(err => console.error(err));
    }
  }, [user]);

  const navLinks = [
    {
      name: "Attendance",
      path: "/teacher/attendance",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Timetable",
      path: "/teacher/timetable",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      name: "Assignments",
      path: "/teacher/assignments",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      name: "Notes",
      path: "/teacher/notes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-[260px] h-screen sticky top-0 bg-white border-r flex flex-col" style={{ borderColor: "var(--color-border)" }}>
      <div className="h-20 flex items-center px-7 border-b border-[#f1f3f5]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#40c057" }}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span className="text-lg font-heading font-bold text-[#212529] tracking-tight">SchoolSync</span>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-wider mb-3 ml-2">Teacher Portal</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navLinks.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-[#495057] hover:bg-[#f8f9fa] hover:text-[#212529]"
              }`}
            >
              <span className={isActive ? "text-emerald-700" : "text-[#adb5bd]"}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-[#f1f3f5] mt-auto">
        <div className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] rounded-lg border border-[#e9ecef]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#40c057] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase">
              {user?.staff_profile ? user.staff_profile.first_name.charAt(0) : (user?.username?.charAt(0) || "T")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#212529] truncate">
                {user?.staff_profile ? `${user.staff_profile.first_name} ${user.staff_profile.last_name}` : user?.username}
              </p>
              <p className="text-[10px] text-[#868e96] font-medium uppercase tracking-wider flex items-center gap-2">
                {user?.role}
                {myAttendance !== null && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[#ced4da]"></span>
                    <span className={`${myAttendance >= 80 ? 'text-emerald-600' : myAttendance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      Att: {myAttendance}%
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button onClick={logout} className="p-1.5 text-[#adb5bd] hover:text-red-500 transition-colors flex-shrink-0" title="Logout">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
