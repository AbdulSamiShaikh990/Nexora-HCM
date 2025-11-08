"use client";
import { useEffect, useState } from "react";

interface Candidate {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function CandidatesPage() {
  const [list, setList] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", skills: "" });
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(window.location.origin + "/api/recuirment/candidates");
      if (query) url.searchParams.set("q", query);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setList(data);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [query]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/recuirment/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create");
      setList((prev) => [data, ...prev]);
      setForm({ name: "", email: "", phone: "", skills: "" });
    } catch (e: any) {
      alert(e.message || "Error");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/recuirment/candidates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      return alert(data?.error || "Failed to delete");
    }
    setList((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Candidates</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Search candidates" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <form onSubmit={createItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 sm:col-span-2">Add Candidate</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="text-sm text-gray-600">No candidates yet.</div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-sm text-gray-700">{c.email || "-"} • {c.phone || "-"}</div>
                  {c.skills && c.skills.length > 0 ? (
                    <div className="text-xs text-gray-800 mt-1">{c.skills.join(", ")}</div>
                  ) : null}
                </div>
                <button onClick={() => remove(c.id)} className="text-sm bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1">Delete</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
