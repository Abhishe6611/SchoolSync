import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination.jsx";
import Table from "../components/Table.jsx";
import ImportExportToolbar from "../components/ImportExportToolbar.jsx";
import { useAuth } from "../context/AuthContext";
import { sanitizeName, sanitizeDigits, sanitizeAlphaNumSpace } from "../utils/inputSanitizer.js";

const emptyForm = {
  route_number: "",
  vehicle_number: "",
  driver_name: "",
  driver_contact: "",
  monthly_fee: 0,
  stops: "",
};

export default function Transport() {
  const [routes, setRoutes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const pageSize = 10;
  
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const fetchData = async () => {
    try {
      const res = await api.get("/transport");
      setRoutes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return routes.filter((r) =>
      `${r.route_number} ${r.vehicle_number} ${r.driver_name}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [routes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedAndFiltered = useMemo(() => {
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

  useEffect(() => { setPage(1); }, [search, sortConfig]);
  const paged = sortedAndFiltered.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    // Parse stops from comma-separated string
    const stopsArray = form.stops.split(",").map(s => s.trim()).filter(s => s !== "");
    
    const payload = { ...form, stops: stopsArray };

    try {
      if (editingId) {
        await api.put(`/transport/${editingId}`, payload);
      } else {
        await api.post("/transport", payload);
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to save transport route.");
    }
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setForm({
      route_number: r.route_number,
      vehicle_number: r.vehicle_number,
      driver_name: r.driver_name,
      driver_contact: r.driver_contact,
      monthly_fee: r.monthly_fee,
      stops: r.stops.join(", "),
    });
  };

  const handleDelete = async (id) => {
    if (!isAdmin || !confirm("Delete this transport route?")) return;
    try {
      await api.delete(`/transport/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { key: "route_number", label: "Route No." },
    { key: "vehicle_number", label: "Vehicle No.", render: (r) => <span className="font-mono text-[13px] font-semibold text-[#495057] bg-[#f1f3f5] px-2 py-0.5 rounded">{r.vehicle_number}</span> },
    { key: "driver_name", label: "Driver Name" },
    { key: "driver_contact", label: "Contact" },
    { key: "monthly_fee", label: "Monthly Fee", render: (r) => <span className="font-semibold text-[#2b8a3e]">₹{r.monthly_fee.toFixed(2)}</span> },
    { key: "stops", label: "Stops", render: (r) => <span className="text-[12px] text-[#868e96] max-w-[200px] truncate block" title={r.stops.join(", ")}>{r.stops.length} stops</span> },
  ];

  if (isAdmin) {
    columns.push({
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button className="text-[13px] font-semibold text-[#4263eb] hover:text-[#3b5bdb] transition-colors" onClick={() => handleEdit(row)}>Edit</button>
          <button className="text-[13px] font-semibold text-red-500 hover:text-red-600 transition-colors" onClick={() => handleDelete(row.id)}>Delete</button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-5">
      <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Transport Fleet</h1>
          <p className="text-[13px] text-[#868e96] mt-0.5">Manage school buses, routes, and drivers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {isAdmin && (
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
            <form onSubmit={handleSubmit} className="card sticky top-24">
              <h2 className="text-sm font-semibold text-[#212529] mb-4">
                {editingId ? "Edit Route" : "Add New Route"}
              </h2>
              <div className="space-y-4">
                <input className="input-field" placeholder="Route No. (e.g. R-01)" value={form.route_number} onChange={(e) => setForm({ ...form, route_number: sanitizeAlphaNumSpace(e.target.value) })} required minLength={2} maxLength={50} title="2–50 characters" />
                <input className="input-field" placeholder="Vehicle No. (e.g. AB-1234)" value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: sanitizeAlphaNumSpace(e.target.value) })} required minLength={2} maxLength={50} title="2–50 characters" />
                <input className="input-field" placeholder="Driver Name" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: sanitizeName(e.target.value) })} required minLength={2} maxLength={100} title="Only letters and spaces allowed (2–100 chars)" />
                <input className="input-field" type="tel" pattern="^[0-9]{10}$" maxLength="10" title="Please enter a valid 10-digit mobile number" placeholder="Driver Contact" value={form.driver_contact} onChange={(e) => setForm({ ...form, driver_contact: sanitizeDigits(e.target.value) })} required />
                <input className="input-field" type="number" step="0.01" min="0" placeholder="Monthly Fee (₹)" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: parseFloat(e.target.value) || 0 })} required />
                <textarea className="input-field min-h-[80px]" placeholder="Stops (comma separated)" value={form.stops} onChange={(e) => setForm({ ...form, stops: e.target.value })} required minLength={3} title="Enter at least one stop (min 3 characters)" />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button type="submit" className="btn-primary w-full">
                  {editingId ? "Update" : "Add Route"}
                </button>
                {editingId && (
                  <button type="button" className="btn-secondary w-full py-2" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className={isAdmin ? "lg:col-span-3 space-y-4 animate-slide-up" : "lg:col-span-4 space-y-4 animate-slide-up"} style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex items-center rounded-lg border bg-white overflow-hidden flex-1 max-w-sm" style={{ borderColor: "var(--color-border)" }}>
              <div className="pointer-events-none flex items-center pl-3.5">
                <svg className="h-4 w-4 text-[#adb5bd]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input className="flex-1 min-w-0 bg-transparent border-none outline-none py-2 px-3 text-[13px] text-[#212529] placeholder-[#adb5bd]" placeholder="Search routes..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[#adb5bd] bg-[#f1f3f5] px-2 py-1 rounded-md">{filtered.length} routes</span>
            </div>
          </div>
          <Table columns={columns} data={paged} onSort={handleSort} sortConfig={sortConfig} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalRecords={filtered.length} pageSize={pageSize} />
        </div>
      </div>
    </div>
  );
}
