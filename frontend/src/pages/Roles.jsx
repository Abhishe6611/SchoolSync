import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDateTime } from "../utils/dateFormatter.js";
import { sanitizeUsername, sanitizeEmail } from "../utils/inputSanitizer.js";

const roleBadge = {
  superadmin: "bg-purple-50 text-purple-700 border border-purple-200",
  admin: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  teacher: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const roleOptions = ["admin", "teacher", "superadmin"];

export default function Roles() {
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "teacher", staff_id: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const [uRes, sRes] = await Promise.all([api.get("/auth/users"), api.get("/staff")]);
      setUsers(uRes.data);
      setStaff(sRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/auth/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Role updated to ${newRole}`, type: 'success' } }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Failed to update role", type: 'error' } }));
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const res = await api.patch(`/auth/users/${userId}/toggle-active`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Are you sure you want to delete this user account? This cannot be undone.")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "User deleted", type: 'success' } }));
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...createForm };
      if (payload.staff_id) payload.staff_id = Number(payload.staff_id);
      else delete payload.staff_id;
      await api.post("/auth/register", payload);
      setShowCreateModal(false);
      setCreateForm({ username: "", email: "", password: "", role: "teacher", staff_id: "" });
      await fetchUsers();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "User account created!", type: 'success' } }));
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create user";
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type: 'error' } }));
    } finally { setSaving(false); }
  };

  const getStaffName = (staffId) => {
    if (!staffId) return null;
    const s = staff.find(st => st.id === staffId);
    return s ? `${s.first_name} ${s.last_name}` : null;
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Roles & Accounts</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">Manage user accounts, assign roles, and control access.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Create Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        {roleOptions.map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#868e96] uppercase tracking-wider">{role}s</p>
                  <p className="text-2xl font-bold text-[#212529] mt-1">{count}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${roleBadge[role]}`}>
                  {role === "superadmin" ? "SA" : role === "admin" ? "AD" : "TR"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
        <input type="text" placeholder="Search by name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} className="input-field max-w-sm" />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0 border border-[#e9ecef] animate-slide-up" style={{ animationDelay: "140ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8f9fa] border-b border-[#e9ecef] text-[11px] uppercase tracking-wider text-[#868e96] font-bold">
              <tr>
                <th className="px-5 py-4 w-12">#</th>
                <th className="px-5 py-4">Username</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Linked Staff</th>
                <th className="px-5 py-4 text-center">Role</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Last Login</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {loading ? (
                <tr><td colSpan="8" className="px-5 py-16 text-center text-[#868e96]">Loading accounts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-5 py-16 text-center text-[#868e96]">No accounts found.</td></tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-5 py-3.5 text-[#adb5bd] font-medium">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#212529]">{u.username}</div>
                      <div className="text-[11px] text-[#adb5bd]">ID: {u.id}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[#495057]">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {u.staff_id ? (
                        <span className="text-[12px] font-medium text-[#4263eb]">{getStaffName(u.staff_id) || `Staff #${u.staff_id}`}</span>
                      ) : (
                        <span className="text-[12px] text-[#ced4da]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={`text-[11px] font-bold rounded-full px-3 py-1 cursor-pointer appearance-none text-center ${roleBadge[u.role] || "bg-gray-50 text-gray-700"}`}
                      >
                        {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => handleToggleActive(u.id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${u.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center text-[12px] text-[#868e96]">
                      {formatDateTime(u.last_login) || "Never"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button 
                        onClick={() => handleDelete(u.id)} 
                        disabled={u.role === "superadmin"}
                        className={`p-1 transition-colors ${u.role === "superadmin" ? "text-gray-300 cursor-not-allowed" : "text-[#adb5bd] hover:text-red-500"}`}
                        title={u.role === "superadmin" ? "Superadmin cannot be deleted" : "Delete account"}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#212529] mb-1">Create User Account</h2>
            <p className="text-[13px] text-[#868e96] mb-5">Add a new admin or teacher login to the system.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1.5">Username</label>
                <input required className="input-field" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: sanitizeUsername(e.target.value) })} placeholder="e.g. john_doe" minLength={3} maxLength={30} title="Letters, numbers, and underscores only (3–30 chars)" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1.5">Email</label>
                <input required type="email" className="input-field" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: sanitizeEmail(e.target.value) })} placeholder="e.g. john@school.com" maxLength={100} pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Enter a valid email address" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1.5">Password</label>
                <input required type="password" minLength={8} maxLength={64} className="input-field" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 8 characters" title="Password must be 8–64 characters" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#495057] mb-1.5">Role</label>
                <select className="select-field" value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {createForm.role === "teacher" && (
                <div>
                  <label className="block text-xs font-semibold text-[#495057] mb-1.5">Link to Staff Member</label>
                  <select className="select-field" value={createForm.staff_id} onChange={e => setCreateForm({ ...createForm, staff_id: e.target.value })}>
                    <option value="">-- None --</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role})</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">{saving ? "Creating..." : "Create Account"}</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
