import { useState, useEffect } from "react";

export default function SplashScreen({ onFinish, user }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1400);
    const finishTimer = setTimeout(() => onFinish(), 1900);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden ${
        exiting ? "animate-splash-exit" : ""
      }`}
      style={{ backgroundColor: "#212529" }}
    >
      {/* Center content */}
      <div className="relative flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="relative animate-scale-in">
          <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse-ring" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 border border-white/10">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
              />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-1.5 animate-fade-in" style={{ animationDelay: "200ms", opacity: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
            SchoolSync
          </h1>
          {user?.role === "teacher" ? (
            <p className="text-xs text-white/70 font-medium tracking-wide">
              Welcome, {user.staff_profile ? `${user.staff_profile.first_name}` : user.username}
            </p>
          ) : (
            <p className="text-xs text-white/40 font-medium tracking-wide uppercase">
              Management System
            </p>
          )}
        </div>

        {/* Loading bar */}
        <div className="w-32 h-0.5 rounded-full bg-white/10 overflow-hidden animate-fade-in" style={{ animationDelay: "400ms", opacity: 0 }}>
          <div
            className="h-full rounded-full bg-white/60"
            style={{
              animation: "loadBar 1.4s ease-in-out forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loadBar {
          0% { width: 0%; }
          60% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
