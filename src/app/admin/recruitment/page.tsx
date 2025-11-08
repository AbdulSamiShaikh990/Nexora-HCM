"use client";
import { useEffect, useMemo, useState } from "react";

type ByStage = Record<string, number>;

export default function RecruitmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobsCount, setJobsCount] = useState(0);
  const [candsCount, setCandsCount] = useState(0);
  const [totalApps, setTotalApps] = useState(0);
  const [byStage, setByStage] = useState<ByStage>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [jr, cr, ar] = await Promise.all([
        fetch("/api/recuirment/jobs"),
        fetch("/api/recuirment/candidates"),
        fetch("/api/recuirment/analytics"),
      ]);
      const [j, c, a] = await Promise.all([jr.json(), cr.json(), ar.json()]);
      if (!jr.ok) throw new Error(j?.error || "Failed to load jobs");
      if (!cr.ok) throw new Error(c?.error || "Failed to load candidates");
      if (!ar.ok) throw new Error(a?.error || "Failed to load analytics");
      setJobsCount(Array.isArray(j) ? j.length : 0);
      setCandsCount(Array.isArray(c) ? c.length : 0);
      setTotalApps(Number(a?.total || 0));
      setByStage(a?.byStage || {});
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const remaining = useMemo(() => {
    const hired = byStage["hired"] || 0;
    const rejected = byStage["rejected"] || 0;
    return Math.max(0, totalApps - (hired + rejected));
  }, [byStage, totalApps]);

  const stages = ["applied","screening","interview","hired","rejected"] as const;
  const maxStageVal = Math.max(1, ...stages.map(s => byStage[s] || 0));

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recruitment</h1>
      <p className="mt-1 text-sm text-gray-700">Manage job postings, candidates, and hiring pipeline.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/admin/recruitment/jobs" className="block rounded-xl border border-white/30 bg-white/60 backdrop-blur shadow-sm hover:bg-white/80 transition">
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900">Jobs</div>
            <div className="text-sm text-gray-700">Create and manage job postings</div>
          </div>
        </a>
        <a href="/admin/recruitment/candidates" className="block rounded-xl border border-white/30 bg-white/60 backdrop-blur shadow-sm hover:bg-white/80 transition">
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900">Candidates</div>
            <div className="text-sm text-gray-700">Track applicants and profiles</div>
          </div>
        </a>
        <a href="/admin/recruitment/applications" className="block rounded-xl border border-white/30 bg-white/60 backdrop-blur shadow-sm hover:bg-white/80 transition">
          <div className="p-4">
            <div className="text-lg font-semibold text-gray-900">Applications</div>
            <div className="text-sm text-gray-700">Move candidates through stages</div>
          </div>
        </a>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/30 bg-white/70 backdrop-blur p-4">
          <div className="text-sm text-gray-600">Total Applications</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "-" : totalApps}</div>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/70 backdrop-blur p-4">
          <div className="text-sm text-gray-600">Remaining In Pipeline</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "-" : remaining}</div>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/70 backdrop-blur p-4">
          <div className="text-sm text-gray-600">Jobs</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "-" : jobsCount}</div>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/70 backdrop-blur p-4">
          <div className="text-sm text-gray-600">Candidates</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "-" : candsCount}</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/30 bg-white/70 backdrop-blur p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-gray-900">Applications by Stage</div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
        <div className="space-y-2">
          {stages.map((s) => {
            const value = byStage[s] || 0;
            const width = Math.max(6, Math.round((value / maxStageVal) * 100));
            const color = s === "hired" ? "bg-green-600" : s === "rejected" ? "bg-red-600" : s === "interview" ? "bg-blue-600" : s === "screening" ? "bg-amber-500" : "bg-gray-500";
            return (
              <div key={s} className="grid grid-cols-5 items-center gap-3">
                <div className="col-span-1 text-sm text-gray-800 capitalize">{s}</div>
                <div className="col-span-4">
                  <div className="h-3 w-full bg-gray-200 rounded">
                    <div className={`h-3 rounded ${color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
                <div className="col-span-5 text-xs text-gray-700">{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

