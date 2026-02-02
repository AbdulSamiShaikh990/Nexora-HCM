"use client";
import { useEffect, useMemo, useState } from "react";

type Stage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
interface Application { 
  id: string; 
  jobId: string; 
  candidateName: string;
  candidateEmail?: string;
  stage: Stage; 
  scorePercent?: number; 
  passed?: boolean;
  notes?: string;
  job?: {
    title: string;
    department?: string;
  };
}
interface Job { id: string; title: string; }

const STAGES: Stage[] = ["applied","screening","interview","offer","hired","rejected"];

export default function PipelinePage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j.title])), [jobs]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [jr, ar] = await Promise.all([
        fetch("/api/recuirment/jobs"),
        fetch("/api/recuirment/applications" + (q ? `?q=${encodeURIComponent(q)}` : "")),
      ]);
      const [j, a] = await Promise.all([jr.json(), ar.json()]);
      if (!jr.ok) throw new Error(j?.error || "Failed jobs");
      if (!ar.ok) throw new Error(a?.error || "Failed applications");
      setJobs(j);
      setApps(a);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q]);

  async function move(id: string, stage: Stage) {
    const res = await fetch(`/api/recuirment/applications/${id}/stage`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ stage }) });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to update");
    setApps(prev => prev.map(a => a.id === id ? data : a));
  }

  const grouped = useMemo(() => {
    const g: Record<Stage, Application[]> = { applied: [], screening: [], interview: [], offer: [], hired: [], rejected: [] };
    for (const a of apps) g[a.stage].push(a);
    return g;
  }, [apps]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pipeline</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-500" placeholder="Search notes (server-side)" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <div>Loading...</div> : error ? <div className="text-red-600">{error}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map(stage => (
            <div key={stage} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3">
              <div className="font-semibold text-gray-900 capitalize">{stage}</div>
              <div className="mt-2 space-y-2">
                {grouped[stage].length === 0 ? (
                  <div className="text-xs text-gray-600">No items</div>
                ) : (
                  grouped[stage].map(a => (
                    <div key={a.id} className="rounded-lg border border-white/40 bg-white/80 p-2">
                      <div className="text-sm text-gray-900">{jobMap[a.jobId] || a.jobId}</div>
                      <div className="text-xs text-gray-700">{candMap[a.candidateId] || a.candidateId}</div>
                      {a.scorePercent != null && (
                        <div className="text-[11px] text-gray-800 mt-1">Score {a.scorePercent}% {a.passed === false ? '• Failed' : ''}</div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STAGES.filter(s => s !== stage).slice(0,4).map(s => (
                          <button key={s} onClick={() => move(a.id, s)} className="text-[11px] bg-gray-100 rounded px-2 py-0.5 capitalize">{s}</button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
