import { useState, useCallback, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import api from "./api/axios";
import { getQueue, deleteFromQueue } from "./api/syncQueue";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TeacherSidebar from "./components/TeacherSidebar.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import GlobalToast from "./components/GlobalToast.jsx";
import Attendance from "./pages/Attendance.jsx";
import Classes from "./pages/Classes.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Fees from "./pages/Fees.jsx";
import Exams from "./pages/Exams.jsx";
import Login from "./pages/Login.jsx";
import Reports from "./pages/Reports.jsx";
import Staff from "./pages/Staff.jsx";
import Students from "./pages/Students.jsx";
import Subjects from "./pages/Subjects.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import StaffAttendance from "./pages/StaffAttendance.jsx";
import ParentPay from "./pages/ParentPay.jsx";
import Timetable from "./pages/Timetable.jsx";
import Transport from "./pages/Transport.jsx";
import Roles from "./pages/Roles.jsx";
import Payroll from "./pages/Payroll.jsx";
import Inventory from "./pages/Inventory.jsx";
import AdminControls from "./pages/AdminControls.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function PageTransition({ children }) {
  return (
    <div className="animate-fade-in" style={{ animationDuration: "300ms" }}>
      {children}
    </div>
  );
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}

function TeacherLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <TeacherSidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const queue = await getQueue();
      if (queue.length > 0) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Syncing ${queue.length} pending actions...`, type: 'success' } }));
        let successCount = 0;
        let failCount = 0;
        for (const req of queue) {
          try {
            let parsedData = req.data;
            try {
               if (typeof req.data === 'string') parsedData = JSON.parse(req.data);
            } catch(e) { /* ignore parse error */ }
            
            await api({
              url: req.url,
              method: req.method,
              data: parsedData,
            });
            await deleteFromQueue(req.id);
            successCount++;
          } catch (err) {
            console.error("Failed to sync request", req, err);
            // If it's a 4xx error (validation, duplicate, not found), it will NEVER succeed. Drop it.
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
               await deleteFromQueue(req.id);
               failCount++;
            }
          }
        }
        if (successCount > 0) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Successfully synced ${successCount} actions!`, type: 'success' } }));
        }
        if (failCount > 0) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `${failCount} offline actions failed validation and were discarded.`, type: 'error' } }));
        }
      }
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-center text-[13px] font-semibold shadow-sm relative z-50">
          You are currently offline. Changes will be saved locally.
        </div>
      )}
      <GlobalToast />
      {showSplash && <SplashScreen onFinish={handleSplashFinish} user={user} />}
      <div
        className={showSplash ? "opacity-0" : "animate-fade-in"}
        style={{ animationDuration: "400ms" }}
      >
        <Routes>
          <Route path="/login" element={user && user.role === 'teacher' ? <Navigate to="/teacher/attendance" replace /> : user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/teacher/login" element={<Navigate to="/login" replace />} />
          <Route path="/pay/:studentId" element={<ParentPay />} />
          
          <Route element={<ProtectedRoute />}>
            {user?.role === "teacher" ? (
              <>
                <Route path="/teacher/attendance" element={<TeacherLayout><Attendance /></TeacherLayout>} />
                <Route path="/teacher/timetable" element={<TeacherLayout><Timetable /></TeacherLayout>} />
                <Route path="/teacher/assignments" element={<TeacherLayout><div className="card text-center py-20 text-[#868e96]">Assignments Module Coming Soon</div></TeacherLayout>} />
                <Route path="/teacher/notes" element={<TeacherLayout><div className="card text-center py-20 text-[#868e96]">Notes Module Coming Soon</div></TeacherLayout>} />
                <Route path="*" element={<Navigate to="/teacher/attendance" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Layout><Dashboard /></Layout>} />
                <Route path="/students" element={<Layout><Students /></Layout>} />
                <Route path="/staff" element={<Layout><Staff /></Layout>} />
                <Route path="/classes" element={<Layout><Classes /></Layout>} />
                <Route path="/subjects" element={<Layout><Subjects /></Layout>} />
                <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
                <Route path="/staff-attendance" element={<Layout><StaffAttendance /></Layout>} />
                <Route path="/fees" element={<Layout><Fees /></Layout>} />
                <Route path="/exams" element={<Layout><Exams /></Layout>} />
                <Route path="/reports" element={<Layout><Reports /></Layout>} />
                <Route path="/timetable" element={<Layout><Timetable /></Layout>} />
                <Route path="/transport" element={<Layout><Transport /></Layout>} />
                <Route path="/payroll" element={<Layout><Payroll /></Layout>} />
                <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
                <Route path="/roles" element={<Layout><Roles /></Layout>} />
                <Route path="/admin-controls" element={<Layout><AdminControls /></Layout>} />
                <Route path="/audit" element={<Layout><AuditLogs /></Layout>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Route>
        </Routes>
      </div>
    </>
  );
}
