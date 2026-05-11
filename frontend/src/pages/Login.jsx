import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setToken } from "../api/axios";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("admin"); // 'admin' or 'teacher'

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = new URLSearchParams();
      payload.append("username", username);
      payload.append("password", password);
      const response = await api.post("/auth/login", payload, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      setToken(response.data.access_token);
      // Let the app layout handle the routing based on role once reloaded
      window.location.href = "/";
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 transition-colors duration-500"
      style={{ backgroundColor: loginMode === "admin" ? "#f8f9fa" : "#f4fce3" }}
    >
      <div className="w-full max-w-sm animate-scale-in">
        <div className="rounded-xl border bg-white p-8" style={{ borderColor: "#e9ecef", boxShadow: "0 4px 24px -4px rgb(0 0 0 / 0.08)" }}>
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-300 ${loginMode === "admin" ? "bg-[#212529]" : "bg-[#40c057]"}`}>
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <h1 className="text-lg font-heading font-bold text-[#212529] tracking-tight">
              SchoolSync
            </h1>
          </div>

          {/* Toggle Switch */}
          <div className="flex bg-[#f1f3f5] p-1 rounded-lg mb-6 relative">
            <button
              type="button"
              onClick={() => setLoginMode("admin")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md z-10 transition-colors ${loginMode === "admin" ? "text-[#212529]" : "text-[#868e96] hover:text-[#495057]"}`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("teacher")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md z-10 transition-colors ${loginMode === "teacher" ? "text-emerald-700" : "text-[#868e96] hover:text-[#495057]"}`}
            >
              Teacher
            </button>
            {/* Sliding background */}
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: loginMode === "admin" ? "translateX(0)" : "translateX(100%)" }}
            />
          </div>

          <p className="text-[13px] text-[#868e96] mb-5">
            {loginMode === "admin" ? "Sign in to the administrative dashboard" : "Sign in to the teacher portal"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#495057]">
                Username
              </label>
              <input
                className="input-field"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#495057]">
                Password
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={64}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600 animate-shake">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button
              className="w-full py-2.5 text-[13px] font-bold tracking-wide rounded-lg text-white transition-all shadow-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: loginMode === "admin" ? "#212529" : "#40c057" }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-[#adb5bd]">
          SchoolSync Management System — v1.0
        </p>
      </div>
    </div>
  );
}
