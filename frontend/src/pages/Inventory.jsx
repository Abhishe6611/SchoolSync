import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Table from "../components/Table.jsx";
import Pagination from "../components/Pagination.jsx";

const CATEGORIES = ["Electronics", "Furniture", "Stationery", "Lab Equipment", "Sports", "Other"];

const emptyItem = { item_name: "", category: "", sku_code: "", is_consumable: false, total_quantity: "", unit_price: "", location: "" };
const emptyTxn = { action_type: "", quantity: "", issued_to_id: "", issued_to_role: "", remarks: "" };

export default function Inventory() {
  const [tab, setTab] = useState("master");
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [showTxn, setShowTxn] = useState(false);
  const [txnForm, setTxnForm] = useState(emptyTxn);
  const [txnItemId, setTxnItemId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemLogs, setItemLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const pageSize = 10;

  const fetchItems = async () => { try { const r = await api.get("/inventory"); setItems(r.data); } catch {} };
  const fetchAllLogs = async () => { try { const r = await api.get("/inventory/logs/all"); setLogs(r.data); } catch {} };
  const fetchPeople = async () => {
    try {
      const [s, st] = await Promise.all([api.get("/staff"), api.get("/students")]);
      setStaffList(s.data); setStudentList(st.data);
    } catch {}
  };

  useEffect(() => { fetchItems(); fetchPeople(); }, []);
  useEffect(() => { if (tab === "logs") fetchAllLogs(); }, [tab]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    await api.post("/inventory", { ...form, total_quantity: Number(form.total_quantity), unit_price: Number(form.unit_price) });
    setShowForm(false); setForm(emptyItem); await fetchItems();
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    await api.post(`/inventory/${txnItemId}/transaction`, {
      item_id: txnItemId, action_type: txnForm.action_type, quantity: Number(txnForm.quantity),
      issued_to_id: txnForm.issued_to_id ? Number(txnForm.issued_to_id) : null,
      issued_to_role: txnForm.issued_to_role || null, remarks: txnForm.remarks,
    });
    setShowTxn(false); setTxnForm(emptyTxn); setTxnItemId(null);
    await fetchItems(); if (tab === "logs") await fetchAllLogs();
    if (selectedItem) { const r = await api.get(`/inventory/${selectedItem._id || selectedItem.id}/logs`); setItemLogs(r.data); }
  };

  const openTxn = (item, type) => { setTxnItemId(item._id || item.id); setTxnForm({ ...emptyTxn, action_type: type }); setShowTxn(true); };
  const viewItemLogs = async (item) => {
    setSelectedItem(item); setTab("logs");
    const r = await api.get(`/inventory/${item._id || item.id}/logs`); setItemLogs(r.data);
  };

  const personName = (id, role) => {
    if (role === "Staff") { const s = staffList.find(x => (x._id || x.id) === id); return s ? `${s.first_name} ${s.last_name}` : `Staff #${id}`; }
    if (role === "Student") { const s = studentList.find(x => (x._id || x.id) === id); return s ? `${s.first_name} ${s.last_name}` : `Student #${id}`; }
    return "—";
  };

  const summary = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter(i => i.available_quantity <= 5 && i.available_quantity > 0).length;
    const outOfStock = items.filter(i => i.available_quantity === 0).length;
    const totalValue = items.reduce((s, i) => s + i.total_quantity * i.unit_price, 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const displayLogs = selectedItem ? itemLogs : logs;
  const logTotalPages = Math.max(1, Math.ceil(displayLogs.length / pageSize));
  const pagedLogs = displayLogs.slice((logPage - 1) * pageSize, logPage * pageSize);

  const itemName = (id) => { const i = items.find(x => (x._id || x.id) === id); return i ? i.item_name : `Item #${id}`; };

  const itemColumns = [
    { key: "item_name", label: "Item", render: r => <span className="font-medium text-ink">{r.item_name}</span> },
    { key: "category", label: "Category", render: r => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700">{r.category}</span> },
    { key: "is_consumable", label: "Type", render: r => <span className={`text-xs font-semibold ${r.is_consumable ? "text-amber-600" : "text-blue-600"}`}>{r.is_consumable ? "Consumable" : "Returnable"}</span> },
    { key: "available_quantity", label: "Stock", render: r => {
      const pct = r.total_quantity > 0 ? (r.available_quantity / r.total_quantity) * 100 : 0;
      const color = r.available_quantity === 0 ? "bg-red-500" : pct <= 25 ? "bg-amber-500" : "bg-emerald-500";
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{r.available_quantity}<span className="text-muted font-normal">/{r.total_quantity}</span></span>
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
        </div>
      );
    }},
    { key: "unit_price", label: "Unit Price", render: r => <span className="font-mono text-sm">₹{r.unit_price.toLocaleString("en-IN")}</span> },
    { key: "location", label: "Location", render: r => <span className="text-xs text-muted">{r.location || "—"}</span> },
    { key: "actions", label: "", render: r => (
      <div className="flex items-center gap-2">
        <button onClick={() => openTxn(r, "Issue")} className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors">Issue</button>
        {!r.is_consumable && <button onClick={() => openTxn(r, "Return")} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Return</button>}
        <button onClick={() => openTxn(r, "Restock")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">Restock</button>
        <button onClick={() => viewItemLogs(r)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">Logs</button>
      </div>
    )},
  ];

  const logColumns = [
    { key: "item_id", label: "Item", render: r => <span className="font-medium text-ink">{itemName(r.item_id)}</span> },
    { key: "action_type", label: "Action", render: r => {
      const colors = { Issue: "bg-amber-500/15 text-amber-700 border-amber-500/20", Return: "bg-blue-500/15 text-blue-700 border-blue-500/20", Restock: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" };
      return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${colors[r.action_type] || ""}`}>{r.action_type}</span>;
    }},
    { key: "quantity", label: "Qty", render: r => <span className="font-mono text-sm font-bold">{r.quantity}</span> },
    { key: "issued_to_id", label: "Issued To", render: r => r.issued_to_id ? <span className="text-sm">{personName(r.issued_to_id, r.issued_to_role)}</span> : <span className="text-muted">—</span> },
    { key: "remarks", label: "Remarks", render: r => <span className="text-xs text-muted">{r.remarks || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <div className="page-header mb-1">
          <div className="page-icon">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H2.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-ink">Inventory</h1>
            <p className="text-sm text-muted">Track school assets, consumables, and stock movements.</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "60ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="card !py-4 text-center"><p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Total Items</p><p className="text-xl font-bold font-mono text-ink">{summary.total}</p></div>
        <div className="card !py-4 text-center"><p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Total Value</p><p className="text-xl font-bold font-mono text-ink">₹{summary.totalValue.toLocaleString("en-IN")}</p></div>
        <div className="card !py-4 text-center"><p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Low Stock</p><p className="text-xl font-bold font-mono text-amber-600">{summary.lowStock}</p></div>
        <div className="card !py-4 text-center"><p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-1">Out of Stock</p><p className="text-xl font-bold font-mono text-red-600">{summary.outOfStock}</p></div>
      </div>

      {/* Tabs */}
      <div className="animate-slide-up" style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          {[{ id: "master", label: "Item Master" }, { id: "logs", label: "Issuance & Logs" }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedItem(null); }} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${tab === t.id ? "bg-white dark:bg-slate-700 text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Transaction Modal */}
      {showTxn && (
        <div className="animate-slide-up">
          <form onSubmit={handleTransaction} className="card border-2 border-primary-200">
            <h3 className="text-sm font-semibold text-ink mb-4">{txnForm.action_type} — {itemName(txnItemId)}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <input className="input-field" type="number" placeholder="Quantity" value={txnForm.quantity} onChange={e => setTxnForm({ ...txnForm, quantity: e.target.value })} required min="1" />
              {txnForm.action_type === "Issue" && (
                <>
                  <select className="select-field" value={txnForm.issued_to_role} onChange={e => setTxnForm({ ...txnForm, issued_to_role: e.target.value, issued_to_id: "" })} required>
                    <option value="">Issue To...</option><option value="Staff">Staff</option><option value="Student">Student</option>
                  </select>
                  {txnForm.issued_to_role && (
                    <select className="select-field" value={txnForm.issued_to_id} onChange={e => setTxnForm({ ...txnForm, issued_to_id: e.target.value })} required>
                      <option value="">Select {txnForm.issued_to_role}</option>
                      {(txnForm.issued_to_role === "Staff" ? staffList : studentList).map(p => (
                        <option key={p._id || p.id} value={p._id || p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
              <input className="input-field" placeholder="Remarks" value={txnForm.remarks} onChange={e => setTxnForm({ ...txnForm, remarks: e.target.value })} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="submit" className="btn-primary">Confirm {txnForm.action_type}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowTxn(false); setTxnForm(emptyTxn); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 1: Item Master */}
      {tab === "master" && (
        <>
          <div className="animate-slide-up" style={{ animationDelay: "140ms", opacity: 0, animationFillMode: "forwards" }}>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Item
              </button>
            ) : (
              <form onSubmit={handleAddItem} className="card">
                <h3 className="text-sm font-semibold text-ink mb-4">Add New Inventory Item</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <input className="input-field" placeholder="Item Name" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} required />
                  <select className="select-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Category</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="input-field" placeholder="SKU Code" value={form.sku_code} onChange={e => setForm({ ...form, sku_code: e.target.value })} />
                  <input className="input-field" type="number" placeholder="Quantity" value={form.total_quantity} onChange={e => setForm({ ...form, total_quantity: e.target.value })} required min="0" />
                  <input className="input-field" type="number" placeholder="Unit Price (₹)" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} min="0" step="0.01" />
                  <input className="input-field" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-ink cursor-pointer col-span-full">
                    <input type="checkbox" checked={form.is_consumable} onChange={e => setForm({ ...form, is_consumable: e.target.checked })} className="rounded border-slate-300" />
                    Consumable item (issued items are not expected to be returned)
                  </label>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button type="submit" className="btn-primary">Save Item</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" }}>
            {items.length === 0 ? (
              <div className="card text-center py-16">
                <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H2.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                <p className="text-sm font-medium text-muted">No inventory items yet.</p>
              </div>
            ) : (
              <><Table columns={itemColumns} data={pagedItems} /><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></>
            )}
          </div>
        </>
      )}

      {/* TAB 2: Logs */}
      {tab === "logs" && (
        <div className="animate-slide-up" style={{ animationDelay: "140ms", opacity: 0, animationFillMode: "forwards" }}>
          {selectedItem && (
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => { setSelectedItem(null); fetchAllLogs(); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                All Logs
              </button>
              <span className="text-sm font-semibold text-ink">Showing logs for: {selectedItem.item_name}</span>
            </div>
          )}
          {displayLogs.length === 0 ? (
            <div className="card text-center py-16"><p className="text-sm font-medium text-muted">No transaction logs found.</p></div>
          ) : (
            <><Table columns={logColumns} data={pagedLogs} /><Pagination page={logPage} totalPages={logTotalPages} onPageChange={setLogPage} /></>
          )}
        </div>
      )}
    </div>
  );
}
