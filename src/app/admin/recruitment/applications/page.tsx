"use client";
import { useEffect, useMemo, useState } from "react";

interface Job { id: string; title: string; }
interface Candidate { id: string; name: string; }
interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  stage: "applied" | "screening" | "interview" | "hired" | "rejected";
  notes?: string | null;
  scorePercent?: number;
  passed?: boolean;
}

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ jobId: "", candidateId: "", stage: "applied", notes: "" });
  const [stageFilter, setStageFilter] = useState("");
  const [q, setQ] = useState("");
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const appsUrl = new URL(window.location.origin + "/api/recuirment/applications");
      if (stageFilter) appsUrl.searchParams.set("stage", stageFilter);
      if (q) appsUrl.searchParams.set("q", q);
      const [jr, cr, ar] = await Promise.all([
        fetch("/api/recuirment/jobs"),
        fetch("/api/recuirment/candidates"),
        fetch(appsUrl.toString()),
      ]);
      const [j, c, a] = await Promise.all([jr.json(), cr.json(), ar.json()]);
      if (!jr.ok) throw new Error(j?.error || "Failed to load jobs");
      if (!cr.ok) throw new Error(c?.error || "Failed to load candidates");
      if (!ar.ok) throw new Error(a?.error || "Failed to load applications");
      setJobs(j);
      setCands(c);
      // Hide ended applications from default list
      setApps((a as Application[]).filter(x => x.stage !== "hired" && x.stage !== "rejected"));
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [stageFilter, q]);

  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j.title])), [jobs]);
  const candMap = useMemo(() => Object.fromEntries(cands.map(c => [c.id, c.name])), [cands]);

  async function createApp(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/recuirment/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: form.jobId,
          candidateId: form.candidateId,
          stage: form.stage,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create");
      setApps((prev) => [data, ...prev]);
      setForm({ jobId: "", candidateId: "", stage: "applied", notes: "" });
    } catch (e: any) {
      alert(e.message || "Error");
    }
  }

  async function advance(id: string, stage: Application["stage"]) {
    const res = await fetch(`/api/recuirment/applications/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to update");
    // Remove from list if ended; otherwise update in place
    if (stage === "hired" || stage === "rejected") {
      setApps((prev) => prev.filter((x) => x.id !== id));
    } else {
      setApps((prev) => prev.map((x) => (x.id === id ? data : x)));
    }
  }

  async function sendFeedback(applicationId: string) {
    const text = feedbackText[applicationId]?.trim();
    if (!text) return;
    const res = await fetch("/api/recuirment/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, by: "Admin", text }),
    });
    if (!res.ok) {
      const d = await res.json();
      return alert(d?.error || "Failed to send feedback");
    }
    setFeedbackText((prev) => ({ ...prev, [applicationId]: "" }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Applications</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="">All stages</option>
          <option value="applied">Applied</option>
          <option value="screening">Screening</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-500" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <form onSubmit={createApp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
        <select className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })} required>
          <option value="">Select Job</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })} required>
          <option value="">Select Candidate</option>
          {cands.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          <option value="applied">Applied</option>
          <option value="screening">Screening</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-500" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 sm:col-span-2">Add Application</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <div className="text-sm text-gray-600">No applications yet.</div>
          ) : (
            apps.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{jobMap[a.jobId] || a.jobId} → {candMap[a.candidateId] || a.candidateId}</div>
                    <div className="text-sm text-gray-700">Stage: {a.stage} {a.scorePercent != null && (<span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">Score {a.scorePercent}% {a.passed === false ? '• Failed' : ''}</span>)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => advance(a.id, "screening")} className="text-xs bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">Screen</button>
                    <button onClick={() => advance(a.id, "interview")} className="text-xs bg-white text-gray-800 border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">Interview</button>
                    <button onClick={() => advance(a.id, "hired")} className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700">Hire</button>
                    <button onClick={() => advance(a.id, "rejected")} className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700">Reject</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-500 sm:col-span-2" placeholder="Write feedback to candidate (visible to admin list)" value={feedbackText[a.id] || ""} onChange={(e) => setFeedbackText(prev => ({ ...prev, [a.id]: e.target.value }))} />
                  <button onClick={() => sendFeedback(a.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-2 text-sm">Send Feedback</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
