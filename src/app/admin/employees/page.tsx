"use client";

import { useEffect, useMemo, useState } from "react";
import { S } from "./styles";

type Status = "Active" | "On Leave" | "Inactive";
type AuditEntry = { id: string; at: string; by: string; action: string };

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  status: Status;
  joinDate: string; // yyyy-mm-dd
  phone?: string;
  location?: string;
  performanceRating?: number;
  skills?: string[];
  certifications?: string[];
  leaveBalance?: number;
  salary?: number;
  projects?: string[];
  feedback?: string;
  auditLog?: AuditEntry[];
  documents?: Array<{ id: string; name: string; type: string; size: number; base64?: string; uploadedAt: string }>;
};

// const STORAGE = "nexora_employees"; // no longer used for source of truth; kept to avoid wider refactor
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

async function apiList(): Promise<Employee[]> {
  const res = await fetch("/api/employees", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load employees");
  const arr = await res.json();
  return (arr as unknown[]).map((e: unknown) => {
    const emp = e as Record<string, unknown>;
    return {
    id: String(emp.id),
    firstName: emp.firstName as string,
    lastName: emp.lastName as string,
    email: emp.email as string,
    jobTitle: emp.jobTitle as string,
    department: emp.department as string,
    status: (emp.status as Status) ?? "Active",
    joinDate: new Date(emp.joinDate as string).toISOString().slice(0, 10),
    phone: (emp.phone as string) ?? "",
    location: (emp.location as string) ?? "",
    performanceRating: (emp.performanceRating as number) ?? undefined,
    skills: (emp.skills as string[]) ?? [],
    certifications: (emp.certifications as string[]) ?? [],
    leaveBalance: (emp.leaveBalance as number) ?? undefined,
    salary: (emp.salary as number) ?? undefined,
    projects: (emp.projects as string[]) ?? [],
    feedback: (emp.feedback as string) ?? "",
    auditLog: (emp.AuditLog as unknown[] ?? []).map((a: unknown) => {
      const audit = a as Record<string, unknown>;
      return { id: String(audit.id), at: audit.createdAt as string, by: audit.by as string, action: audit.action as string };
    }),
    documents: (emp.Document as unknown[] ?? []).map((d: unknown) => {
      const doc = d as Record<string, unknown>;
      return { id: String(doc.id), name: doc.name as string, type: doc.type as string, size: doc.size as number, uploadedAt: doc.uploadedAt as string };
    }),
    };
  });
}

async function apiCreate(payload: Omit<Employee, "id"> & { password: string }) {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "Failed to create employee";
    try { const j = await res.json(); msg = j?.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function apiUpdate(idNum: number, payload: Partial<Employee>) {
  const res = await fetch(`/api/employees/${idNum}` ,{
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "Failed to update employee";
    try { const j = await res.json(); msg = j?.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function apiDelete(idNum: number) {
  const res = await fetch(`/api/employees/${idNum}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete employee");
}

const Glass = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`${S.glassCard} ${className}`}>{children}</div>
);

const Badge = ({ status }: { status: Status }) => {
  const m: Record<Status, string> = {
    Active: "bg-emerald-100/70 text-emerald-700",
    "On Leave": "bg-amber-100/70 text-amber-700",
    Inactive: "bg-rose-100/70 text-rose-700",
  };
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${m[status]}`}>{status}</span>;
};

type FormState = Omit<Employee, "id"> & { password?: string };
const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  department: "",
  status: "Active",
  joinDate: new Date().toISOString().slice(0, 10),
  phone: "",
  location: "",
  performanceRating: 4.0,
  skills: [],
  certifications: [],
  leaveBalance: 10,
  salary: 0,
  projects: [],
  feedback: "",
  auditLog: [],
  documents: [],
  password: "",
};

export default function Page() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [stat, setStat] = useState<Status | "All">("All");
  const [sortKey, setSortKey] = useState<keyof Employee>("firstName");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [view, setView] = useState<Employee | null>(null);
  const [confirm, setConfirm] = useState<Employee | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Advanced filters & suggestions
  const [advOpen, setAdvOpen] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function refresh() {
    try {
      const list = await apiList();
      setRows(list);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => { void refresh(); }, []);

  const departments = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.department).filter(Boolean)))], [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter(r => {
      const okDept = dept === "All" || r.department === dept;
      const okStat = stat === "All" || r.status === stat;
      const okQ = !term || `${r.firstName} ${r.lastName} ${r.email} ${r.jobTitle} ${r.department} ${r.location ?? ""}`.toLowerCase().includes(term);
      const okSkill = !skillFilter || (r.skills ?? []).some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));
      const okRating = !minRating || (r.performanceRating ?? 0) >= minRating;
      const okFrom = !dateFrom || new Date(r.joinDate) >= new Date(dateFrom);
      const okTo = !dateTo || new Date(r.joinDate) <= new Date(dateTo);
      return okDept && okStat && okQ && okSkill && okRating && okFrom && okTo;
    });
    const sorted = [...list].sort((a, b) => {
      const av = String(a[sortKey] ?? "").toLowerCase();
      const bv = String(b[sortKey] ?? "").toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, q, dept, stat, skillFilter, minRating, dateFrom, dateTo, sortKey, dir]);

  const total = Math.max(1, Math.ceil(filtered.length / pageSize));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > total) setPage(1); }, [total, page]);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setErr(null); setShowForm(true); };
  const openEdit = (e: Employee) => { const { ...rest } = e; setEditId(e.id); setForm({ ...emptyForm, ...rest }); setErr(null); setShowForm(true); };
  const saveForm = async () => {
    if (!form.firstName || !form.lastName) return setErr("First & last name required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("Valid email required");
    if (!form.jobTitle || !form.department) return setErr("Job title & department required");
    if (!form.joinDate) return setErr("Join date required");
    if (!editId) {
      const pwd = form.password?.trim() || "";
      if (pwd.length < 6) return setErr("Password must be at least 6 characters");
    }
    try {
      if (editId && /^\d+$/.test(editId)) {
        const { ...rest } = form;
        await apiUpdate(Number(editId), rest);
      } else if (!editId) {
        await apiCreate({ ...(form as Required<FormState>), password: String(form.password) });
      } else {
        return setErr("Cannot edit this record");
      }
      await refresh();
      setShowForm(false);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setErr(error?.message || "Failed to save");
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    try {
      if (!/^\d+$/.test(confirm.id)) throw new Error("Cannot delete this record");
      await apiDelete(Number(confirm.id));
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setConfirm(null);
    }
  };

  const sortBy = (k: keyof Employee) => {
    if (sortKey === k) setDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setDir("asc"); }
  };


  // Bulk selection helpers
  function toggleSelect(id: string, checked: boolean) {
    const copy = new Set(selected);
    if (checked) copy.add(id); else copy.delete(id);
    setSelected(copy);
  }
  function toggleSelectAll(checked: boolean) {
    if (!checked) { setSelected(new Set()); return; }
    setSelected(new Set(filtered.map(r => r.id)));
  }

  // Export CSV from current filtered set
  function exportCSV() {
    const headers = [
      'First Name','Last Name','Email','Job Title','Department','Status','Join Date','Rating','Skills'
    ];
    const lines = filtered.map(r => [
      r.firstName, r.lastName, r.email, r.jobTitle, r.department, r.status, r.joinDate,
      r.performanceRating ?? '', (r.skills ?? []).join('|')
    ]);
    const csv = [headers, ...lines]
      .map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Documents upload helpers
  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const docs: NonNullable<Employee['documents']> = [];
    for (const f of Array.from(files)) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read error'));
        reader.readAsDataURL(f);
      });
      docs.push({ id: id(), name: f.name, type: f.type || 'file', size: f.size, base64, uploadedAt: new Date().toISOString() });
    }
    setForm(prev => ({ ...prev, documents: [...(prev.documents ?? []), ...docs] }));
  }
  function removeDocument(docId: string) {
    setForm(prev => ({ ...prev, documents: (prev.documents ?? []).filter(d => d.id !== docId) }));
  }

  // Bulk actions
  const bulkStatus = async (status: Status) => {
    const ids = Array.from(selected).filter(id => /^\d+$/.test(id)).map(n => Number(n));
    try {
      await Promise.all(ids.map(i => apiUpdate(i, { status })));
      await refresh();
    } catch (e) { console.error(e); }
    setSelected(new Set());
  };

  const bulkChangeDept = async () => {
    const d = prompt("New department for selected?");
    if (!d) return;
    const ids = Array.from(selected).filter(id => /^\d+$/.test(id)).map(n => Number(n));
    try {
      await Promise.all(ids.map(i => apiUpdate(i, { department: d })));
      await refresh();
    } catch (e) { console.error(e); }
    setSelected(new Set());
  };

  const bulkAssignProject = async () => {
    const p = prompt("Project to assign?");
    if (!p) return;
    const ids = Array.from(selected).filter(id => /^\d+$/.test(id)).map(n => Number(n));
    const byId = new Map(rows.map(r => [Number(r.id), r]));
    try {
      await Promise.all(ids.map(i => {
        const r = byId.get(i);
        const next = Array.from(new Set([...(r?.projects ?? []), p]));
        return apiUpdate(i, { projects: next });
      }));
      await refresh();
    } catch (e) { console.error(e); }
    setSelected(new Set());
  };

  // Google Sheets CSV sync (append/update by email)
  const syncFromSheetPrompt = async () => {
    const url = prompt("Paste public CSV URL (Google Sheets: File > Share > Publish to the web > CSV):");
    if (!url) return;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return alert("CSV has no rows");
      const headers = lines[0].split(",").map(h => h.trim().replace(/^\"|\"$/g, ""));
      const idx = (k: string) => headers.findIndex(h => h.toLowerCase() === k.toLowerCase());
      const iFirst = idx("firstName"), iLast = idx("lastName"), iEmail = idx("email"), iJob = idx("jobTitle"), iDept = idx("department"), iStatus = idx("status"), iJoin = idx("joinDate"), iRating = idx("performanceRating"), iSkills = idx("skills");
      const incoming: Employee[] = lines.slice(1).map(l => {
        const cells = l.match(/\"(?:[^\"]|\"\")*\"|[^,]+/g)?.map(c => c.replace(/^\"|\"$/g, '').replace(/\"\"/g,'\"')) ?? [];
        const email = cells[iEmail] ?? "";
        return {
          id: id(),
          firstName: cells[iFirst] ?? "",
          lastName: cells[iLast] ?? "",
          email,
          jobTitle: cells[iJob] ?? "",
          department: cells[iDept] ?? "",
          status: (cells[iStatus] as Status) || "Active",
          joinDate: cells[iJoin] ?? new Date().toISOString().slice(0,10),
          performanceRating: Number(cells[iRating] ?? 0) || undefined,
          skills: (cells[iSkills]?.split(/\||;/) ?? []).filter(Boolean),
        } as Employee;
      });
      setRows(prev => {
        const byEmail = new Map(prev.map(r => [r.email, r]));
        for (const e of incoming) {
          if (byEmail.has(e.email)) {
            const old = byEmail.get(e.email)!;
            byEmail.set(e.email, { ...old, ...e, id: old.id });
          } else {
            byEmail.set(e.email, e);
          }
        }
        return Array.from(byEmail.values());
      });
      alert("Sync complete");
    } catch (e) {
      alert("Failed to sync: " + (e as { message?: string })?.message);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 tracking-tight truncate">Employee Management</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage your organization&apos;s workforce.</p>
        </div>
        <button onClick={openAdd} className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow hover:brightness-110 transition-all">
          <span className="text-base">＋</span> <span className="hidden xs:inline">Add Employee</span><span className="xs:hidden">Add</span>
        </button>
      </div>

      {/* Search & Filters */}
      <Glass className="p-3 sm:p-4 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <input value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} placeholder="Search employees (skills, roles, dept)…" className={S.searchInput + " pl-10 pr-3"} />
            <span className="absolute left-3 top-2.5 text-gray-400">🔎</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={dept} onChange={e=>{setDept(e.target.value); setPage(1);}} className="w-full sm:w-auto rounded-xl border border-white/40 bg-white/80 backdrop-blur px-3 py-2.5 text-sm text-gray-900 min-w-0">
              {departments.map(d=> <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={stat} onChange={e=>{setStat(e.target.value as "All" | Status); setPage(1);}} className="w-full sm:w-auto rounded-xl border border-white/40 bg-white/80 backdrop-blur px-3 py-2.5 text-sm text-gray-900 min-w-0">
              {(["All","Active","On Leave","Inactive"] as const).map((s)=> <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={()=>setAdvOpen(v=>!v)} className={`${S.advButton} w-full sm:w-auto whitespace-nowrap`}>{advOpen?"Hide Filters":"⚙ Advanced"}</button>
          </div>
        </div>
        {advOpen && (
          <div className={S.advPanel}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="block text-xs font-bold text-gray-800 mb-2">Skill contains</span>
              <input value={skillFilter} onChange={e=>setSkillFilter(e.target.value)} placeholder="e.g. React" className={S.advFieldInput} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-gray-800 mb-2">Min Rating</span>
              <input type="number" min={0} max={5} step={0.1} value={minRating} onChange={e=>setMinRating(Number(e.target.value))} className={S.advFieldInput} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-gray-800 mb-2">Joined From</span>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className={S.advFieldInput} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-gray-800 mb-2">Joined To</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className={S.advFieldInput} />
            </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={()=>{setSkillFilter(""); setMinRating(0); setDateFrom(""); setDateTo("");}} className={S.clearBtn}>Clear Filters</button>
              <button onClick={()=>setPage(1)} className={S.applyBtn}>Apply Filters</button>
            </div>
          </div>
        )}
      </Glass>

      {/* Table */}
      <Glass>
        <div className="p-3 sm:p-4 border-b border-white/20">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 tracking-wide">All Employees ({filtered.length})</h2>
            {selected.size > 0 && <span className="text-xs text-gray-600 font-medium">Selected: {selected.size}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
            <button onClick={()=>bulkStatus("Active")} disabled={selected.size===0} className="px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap text-[10px] sm:text-xs">Set Active</button>
            <button onClick={()=>bulkStatus("Inactive")} disabled={selected.size===0} className="px-2 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap text-[10px] sm:text-xs">Set Inactive</button>
            <button onClick={bulkChangeDept} disabled={selected.size===0} className="px-2 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap text-[10px] sm:text-xs">Change Dept</button>
            <button onClick={bulkAssignProject} disabled={selected.size===0} className="px-2 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap text-[10px] sm:text-xs">Assign Project</button>
            <button onClick={exportCSV} className="px-2 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-all whitespace-nowrap text-[10px] sm:text-xs">Export CSV</button>
            <button onClick={()=>window.print()} className="px-2 py-1.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-all whitespace-nowrap text-[10px] sm:text-xs hidden xs:inline-flex">Print/PDF</button>
            <button onClick={syncFromSheetPrompt} className="px-2 py-1.5 rounded-lg border border-cyan-300 bg-cyan-50 text-cyan-700 font-semibold hover:bg-cyan-100 transition-all whitespace-nowrap text-[10px] sm:text-xs hidden sm:inline-flex">Sync Sheets</button>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-700 uppercase tracking-wide">
                <th className="px-4 py-3"><input type="checkbox" onChange={(e)=>toggleSelectAll(e.target.checked)} /></th>
                <Th label="Employee" onClick={()=>sortBy("firstName")} active={sortKey==="firstName"} dir={dir} />
                <Th label="Job Title" onClick={()=>sortBy("jobTitle")} active={sortKey==="jobTitle"} dir={dir} />
                <Th label="Department" onClick={()=>sortBy("department")} active={sortKey==="department"} dir={dir} />
                <Th label="Status" onClick={()=>sortBy("status")} active={sortKey==="status"} dir={dir} />
                <Th label="Join Date" onClick={()=>sortBy("joinDate")} active={sortKey==="joinDate"} dir={dir} />
                <th className="px-4 py-3 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(e=> (
                <tr key={e.id} className="border-t border-white/10 hover:bg-white/70">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(e.id)} onChange={(ev)=>toggleSelect(e.id, ev.target.checked)} /></td>
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 flex items-center justify-center text-xs font-semibold text-indigo-700">{e.firstName[0]}{e.lastName[0]}</div>
                      <div>
                        <div className="font-medium text-gray-900">{e.firstName} {e.lastName}</div>
                        <div className="text-gray-500">{e.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{e.jobTitle}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{e.department}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><Badge status={e.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{new Date(e.joinDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right pr-6">
                    <div className="inline-flex gap-2">
                      <IconButton title="View" onClick={()=>setView(e)}>👁️</IconButton>
                      <IconButton title="Edit" onClick={()=>openEdit(e)}>✏️</IconButton>
                      <IconButton title="Delete" danger onClick={()=>setConfirm(e)}>🗑️</IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-gray-500">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-2 sm:space-y-3 p-2 sm:p-3 lg:p-4">
          {items.map(e=> (
            <div key={e.id} className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-3 hover:bg-white/80 transition-all overflow-hidden">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={(ev)=>toggleSelect(e.id, ev.target.checked)} className="flex-shrink-0 mt-1" />
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 flex items-center justify-center text-xs sm:text-sm font-semibold text-indigo-700 flex-shrink-0">{e.firstName[0]}{e.lastName[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">{e.firstName} {e.lastName}</div>
                    <div className="text-xs sm:text-sm text-gray-600 truncate">{e.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1">
                  <IconButton title="View" onClick={()=>setView(e)}>👁️</IconButton>
                  <IconButton title="Edit" onClick={()=>openEdit(e)}>✏️</IconButton>
                  <IconButton title="Delete" danger onClick={()=>setConfirm(e)}>🗑️</IconButton>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Job Title</div>
                  <div className="font-medium text-gray-900 truncate mt-0.5">{e.jobTitle}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Department</div>
                  <div className="font-medium text-gray-900 truncate mt-0.5">{e.department}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Status</div>
                  <div className="mt-0.5"><Badge status={e.status} /></div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Join Date</div>
                  <div className="font-medium text-gray-900 mt-0.5">{new Date(e.joinDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
          {items.length===0 && (
            <div className="px-4 py-12 sm:px-6 sm:py-16 text-center text-sm text-gray-500">No employees found.</div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-white/20 gap-2 sm:gap-3">
          <div className="text-xs text-gray-500 order-2 sm:order-1">Page {page} of {total}</div>
          <div className="flex gap-1.5 sm:gap-2 order-1 sm:order-2">
            <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/40 bg-white/80 hover:bg-white/90 disabled:opacity-40 text-xs sm:text-sm font-medium transition-all" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button>
            <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/40 bg-white/80 hover:bg-white/90 disabled:opacity-40 text-xs sm:text-sm font-medium transition-all" disabled={page===total} onClick={()=>setPage(p=>Math.min(total,p+1))}>Next</button>
          </div>
        </div>
      </Glass>

      {/* Modal: Create/Edit */}
      {showForm && (
        <Modal title={editId?"Edit Employee":"Add Employee"} onClose={()=>setShowForm(false)} wide>
          {err && <div className="mb-3 text-rose-600 text-xs sm:text-sm">{err}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
            <Field label="First Name" value={form.firstName} onChange={v=>setForm({...form, firstName:v})} required />
            <Field label="Last Name" value={form.lastName} onChange={v=>setForm({...form, lastName:v})} required />
            <Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form, email:v})} required />
            <Field label="Phone" value={form.phone ?? ""} onChange={v=>setForm({...form, phone:v})} />
            <Field label="Job Title" value={form.jobTitle} onChange={v=>setForm({...form, jobTitle:v})} required />
            <Field label="Department" value={form.department} onChange={v=>setForm({...form, department:v})} required />
          <Select label="Status" value={form.status} onChange={v=>setForm({...form, status:v as Status})} options={["Active","On Leave","Inactive"]} />
          <Field label="Join Date" type="date" value={form.joinDate} onChange={v=>setForm({...form, joinDate:v})} />
          {!editId && (
            <Field label="Password" type="password" value={form.password ?? ""} onChange={v=>setForm({...form, password:v})} required />
          )}
          <Field label="Location" value={form.location ?? ""} onChange={v=>setForm({...form, location:v})} />
          <Field label="Performance Rating (1-5)" type="number" value={String(form.performanceRating ?? 0)} onChange={v=>setForm({...form, performanceRating:Number(v)})} />
          <Field label="Salary (monthly)" type="number" value={String(form.salary ?? 0)} onChange={v=>setForm({...form, salary:Number(v)})} />
          <Field label="Leave Balance (days)" type="number" value={String(form.leaveBalance ?? 0)} onChange={v=>setForm({...form, leaveBalance:Number(v)})} />
            <ChipsField label="Skills" value={form.skills ?? []} onChange={(arr)=>setForm({...form, skills:arr})} placeholder="Type skill and press Enter" />
            <ChipsField label="Certifications" value={form.certifications ?? []} onChange={(arr)=>setForm({...form, certifications:arr})} placeholder="Type cert and press Enter" />
            <ChipsField label="Projects" value={form.projects ?? []} onChange={(arr)=>setForm({...form, projects:arr})} placeholder="Type project and press Enter" />
            <TextArea label="Feedback" value={form.feedback ?? ""} onChange={(v)=>setForm({...form, feedback:v})} rows={3} />
            <div className="md:col-span-2">
              <div className="block text-sm font-bold text-gray-800 mb-2">Upload Documents</div>
              <input type="file" multiple onChange={(e)=>handleFilesSelected(e.target.files)} className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
              {(form.documents ?? []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {(form.documents ?? []).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-300 bg-gray-50">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                        <div className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                      </div>
                      <button onClick={()=>removeDocument(doc.id)} className="ml-3 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-gray-400 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-500 transition-all" onClick={()=>setShowForm(false)}>Cancel</button>
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md hover:brightness-110 transition-all" onClick={saveForm}>{editId?"Save Changes":"Create"}</button>
          </div>
        </Modal>
      )}

      {/* Modal: View */}
      {view && (
        <Modal title="Employee Details" onClose={()=>setView(null)}>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 flex items-center justify-center text-xs sm:text-sm font-semibold text-indigo-700 flex-shrink-0">{view.firstName[0]}{view.lastName[0]}</div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-base sm:text-lg font-semibold truncate">{view.firstName} {view.lastName}</div>
              <div className="text-sm sm:text-base text-gray-600 truncate">{view.email}</div>
              <Badge status={view.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm">
            <KeyVal k="Job Title" v={view.jobTitle} />
            <KeyVal k="Department" v={view.department} />
            <KeyVal k="Join Date" v={new Date(view.joinDate).toLocaleDateString()} />
            <KeyVal k="Phone" v={view.phone ?? "—"} />
            <KeyVal k="Location" v={view.location ?? "—"} />
            <KeyVal k="Rating" v={String(view.performanceRating ?? "—")} />
            <KeyVal k="Skills" v={(view.skills ?? []).join(", ") || "—"} />
          </div>
          <div className="mt-4 sm:mt-6 flex justify-end"><button className="px-3 sm:px-4 py-2 rounded-xl border border-white/30 text-sm" onClick={()=>setView(null)}>Close</button></div>
        </Modal>
      )}

      {/* Modal: Delete */}
      {confirm && (
        <Modal title="Delete Employee" onClose={()=>setConfirm(null)}>
          <p className="text-xs sm:text-sm text-gray-600">Delete {confirm.firstName} {confirm.lastName}? This action cannot be undone.</p>
          <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button className="px-3 sm:px-4 py-2 rounded-xl border border-white/30 text-sm" onClick={()=>setConfirm(null)}>Cancel</button>
            <button className="px-3 sm:px-4 py-2 rounded-xl text-white text-sm bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Delete</button>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th className="px-4 py-3 select-none">
      <button onClick={onClick} className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-800 hover:text-indigo-600">
        {label}
        <span className={`${active?"opacity-100":"opacity-40"}`}>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function IconButton({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className={`${S.iconButton} ${danger?"text-rose-600":""}`}>{children}</button>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={wide ? S.modalPanelWide : S.modalPanel}>
        <div className="flex items-center justify-between">
          <h3 className={S.modalTitle}>{title}</h3>
          <button onClick={onClose} className={S.modalClose}>✕</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className={S.label}>{label}{required && <span className="text-rose-600"> *</span>}</span>
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} className={S.input} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className={S.label}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} className={S.select}>
        {options.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{k}</div>
      <div className="mt-1 font-medium text-gray-900">{v}</div>
    </div>
  );
}

// Chips input for arrays
function ChipsField({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (arr: string[])=>void; placeholder?: string }){
  const [text, setText] = useState("");
  function add(){ const v = text.trim(); if(!v) return; if(!value.includes(v)) onChange([...value, v]); setText(""); }
  return (
    <div className="md:col-span-2">
      <div className={S.label}>{label}</div>
      <div className={S.chipsContainer}>
        {value.map((s)=> (
          <span key={s} className={S.chip}>{s}
            <button onClick={()=>onChange(value.filter(x=>x!==s))} className={S.chipRemove}>✕</button>
          </span>
        ))}
        <input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); add(); } }} placeholder={placeholder} className="flex-1 min-w-[160px] bg-transparent outline-none text-sm px-2 text-gray-900 placeholder:text-gray-400" />
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, rows=3 }: { label: string; value: string; onChange: (v:string)=>void; rows?: number }){
  return (
    <label className="block md:col-span-2">
      <span className={S.label}>{label}</span>
      <textarea rows={rows} value={value} onChange={(e)=>onChange(e.target.value)} className={S.textArea} />
    </label>
  );
}

