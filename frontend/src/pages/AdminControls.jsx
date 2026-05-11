import { useEffect, useState } from "react";
import api from "../api/axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const emptySettings = {
  school_name: "", address: "", phone: "", email: "",
  registration_no: "", principal_name: "", admission_head: "", hr_head: "", admin_pin: "",
};

export default function AdminControls() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [settings, setSettings] = useState(emptySettings);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("branding");

  // Promotion state
  const [preview, setPreview] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoResult, setPromoResult] = useState(null);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setPinError("");
    try {
      await api.post("/admin/verify-pin", { pin });
      setUnlocked(true);
      fetchSettings();
    } catch {
      setPinError("Invalid PIN. Access denied.");
    }
  };

  const fetchSettings = async () => {
    const res = await api.get("/admin/school-settings/full");
    setSettings(res.data);
    if (res.data.logo_url) setLogoPreview(`${API_BASE}${res.data.logo_url}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      const { _id, id, created_at, updated_at, logo_url, ...payload } = settings;
      await api.put("/admin/school-settings", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* */ }
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/admin/school-logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setLogoPreview(`${API_BASE}${res.data.logo_url}?t=${Date.now()}`);
    } catch { alert("Logo upload failed"); }
  };

  const fetchPreview = async () => {
    const res = await api.get("/admin/promotion-preview");
    setPreview(res.data);
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const res = await api.post("/admin/promote-students");
      setPromoResult(res.data);
      setConfirmText("");
      setPreview(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Promotion failed");
    }
    setPromoting(false);
  };

  // ── PIN GATE ──
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-slide-up border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#212529]">Admin Controls</h2>
            <p className="text-sm text-[#868e96] mt-1">Enter the admin PIN to continue</p>
          </div>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              className="input-field text-center text-lg font-mono tracking-[0.5em] mb-4"
              placeholder="• • • • • •"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              minLength={4}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-xs font-semibold text-center mb-3">{pinError}</p>}
            <button type="submit" className="btn-primary w-full py-2.5">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN PANEL ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <div className="page-header mb-1">
          <div className="page-icon" style={{ background: "linear-gradient(135deg, #e03131, #c92a2a)" }}>
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink">Admin Controls</h1>
            <p className="text-sm text-muted">School branding, student promotions, and system settings.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 w-fit">
          {[{ id: "branding", label: "School Branding" }, { id: "promotion", label: "Student Promotion" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${tab === t.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══ TAB 1: BRANDING ══ */}
      {tab === "branding" && (
        <div className="animate-slide-up" style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <form onSubmit={handleSave} className="lg:col-span-2 card">
              <h3 className="text-sm font-semibold text-ink mb-5">School Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#495057] mb-1">School Name</label><input className="input-field" value={settings.school_name} onChange={e => setSettings({...settings, school_name: e.target.value})} required /></div>
                <div className="md:col-span-2"><label className="block text-xs font-semibold text-[#495057] mb-1">Address</label><input className="input-field" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} required /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">Phone</label><input className="input-field" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">Email</label><input className="input-field" type="email" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">Registration No.</label><input className="input-field" value={settings.registration_no} onChange={e => setSettings({...settings, registration_no: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">Principal Name</label><input className="input-field" value={settings.principal_name} onChange={e => setSettings({...settings, principal_name: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">Admission Head</label><input className="input-field" value={settings.admission_head} onChange={e => setSettings({...settings, admission_head: e.target.value})} /></div>
                <div><label className="block text-xs font-semibold text-[#495057] mb-1">HR Head</label><input className="input-field" value={settings.hr_head} onChange={e => setSettings({...settings, hr_head: e.target.value})} /></div>
              </div>
              <hr className="my-5 border-slate-200" />
              <h3 className="text-sm font-semibold text-ink mb-3">Security</h3>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-[#495057] mb-1">Admin PIN</label>
                <input className="input-field font-mono tracking-wider" type="password" value={settings.admin_pin} onChange={e => setSettings({...settings, admin_pin: e.target.value})} minLength={4} maxLength={10} />
                <p className="text-[10px] text-muted mt-1">This PIN is required to access Admin Controls.</p>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Settings"}</button>
                {saved && <span className="text-sm font-medium text-emerald-600 animate-fade-in">✓ Saved successfully</span>}
              </div>
            </form>

            {/* Logo & Preview */}
            <div className="space-y-5">
              <div className="card text-center">
                <h3 className="text-sm font-semibold text-ink mb-4">School Logo</h3>
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto mb-4 overflow-hidden bg-slate-50">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  )}
                </div>
                <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              {/* Live Preview */}
              <div className="card !p-0 overflow-hidden">
                <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", color: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 16, fontWeight: 800 }}>S</span>}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{settings.school_name || "School Name"}</p>
                    <p style={{ margin: 0, fontSize: 9, opacity: 0.7 }}>{settings.address || "Address"}</p>
                    <p style={{ margin: 0, fontSize: 8, opacity: 0.5 }}>Reg: {settings.registration_no || "—"}</p>
                  </div>
                </div>
                <div className="p-3 text-center text-[10px] text-muted font-semibold uppercase tracking-wider">Letterhead Preview</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB 2: PROMOTION ══ */}
      {tab === "promotion" && (
        <div className="animate-slide-up" style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}>
          {promoResult ? (
            <div className="card text-center py-12 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">Promotion Complete!</h2>
              <p className="text-sm text-muted mb-4">{promoResult.message}</p>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
                <div className="bg-emerald-50 rounded-lg p-3"><p className="text-[10px] uppercase text-emerald-600 font-bold">Promoted</p><p className="text-2xl font-bold text-emerald-700">{promoResult.promoted}</p></div>
                <div className="bg-amber-50 rounded-lg p-3"><p className="text-[10px] uppercase text-amber-600 font-bold">Passed Out</p><p className="text-2xl font-bold text-amber-700">{promoResult.passed_out}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] uppercase text-slate-500 font-bold">Skipped</p><p className="text-2xl font-bold text-slate-600">{promoResult.errors}</p></div>
              </div>
              <button onClick={() => setPromoResult(null)} className="btn-secondary">Done</button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="card border-2 border-red-200 bg-red-50/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-800">Danger Zone: Mass Student Promotion</h3>
                    <p className="text-xs text-red-600">This action will promote ALL active students to the next grade. Students in the highest grade will be marked as "Passed Out".</p>
                  </div>
                </div>

                {!preview ? (
                  <button onClick={fetchPreview} className="btn-secondary border-red-300 text-red-700 hover:bg-red-100 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Preview Promotion
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 text-[11px] uppercase tracking-wider text-red-700 font-bold">
                          <tr><th className="px-4 py-3 text-left">From</th><th className="px-4 py-3 text-left">To</th><th className="px-4 py-3 text-right">Students</th></tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {preview.preview.map((row, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 font-medium">Grade {row.from_grade}</td>
                              <td className="px-4 py-2.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.to === "Passed Out" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{row.to}</span></td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs font-semibold text-red-700">Total students affected: <span className="font-mono">{preview.total_students}</span></p>

                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">PROMOTE</span> to confirm</label>
                      <input className="input-field border-red-300 focus:border-red-500 font-mono" placeholder="PROMOTE" value={confirmText} onChange={e => setConfirmText(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handlePromote} disabled={confirmText !== "PROMOTE" || promoting} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                        {promoting ? "Processing..." : "Execute Promotion"}
                      </button>
                      <button onClick={() => { setPreview(null); setConfirmText(""); }} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
