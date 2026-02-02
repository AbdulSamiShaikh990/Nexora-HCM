"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j.title])), [jobs]);

  const load = async () => {
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
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function move(id: string, stage: Stage) {
    const res = await fetch(`/api/recuirment/applications/${id}/stage`, { 
      method: "PATCH", 
      headers: {"Content-Type":"application/json"}, 
      body: JSON.stringify({ stage }) 
    });
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
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/admin/recruitment')}
          className="group flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-xl border border-white/20 hover:bg-white shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-gray-700 font-medium">Back to Recruitment Hub</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pipeline</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input 
          className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-500" 
          placeholder="Search applications..." 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
        />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map(stage => (
            <div key={stage} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-900 capitalize">{stage}</div>
                <div className="text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                  {grouped[stage].length}
                </div>
              </div>
              
              <div className="space-y-2">
                {grouped[stage].length === 0 ? (
                  <div className="text-xs text-gray-600 text-center py-4">No applications</div>
                ) : (
                  grouped[stage].map(a => (
                    <div key={a.id} className="rounded-lg border border-white/40 bg-white/80 p-3">
                      <div className="font-medium text-sm text-gray-900">{a.candidateName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {a.job?.title || jobMap[a.jobId] || "Unknown Job"}
                      </div>
                      
                      {a.candidateEmail && (
                        <div className="text-xs text-gray-500 mt-1">
                          📧 {a.candidateEmail}
                        </div>
                      )}
                      
                      {typeof a.scorePercent === 'number' && (
                        <div className={`text-xs mt-1 font-medium ${
                          a.passed ? "text-green-600" : "text-red-600"
                        }`}>
                          Test: {a.scorePercent}% {a.passed ? "✓" : "✗"}
                        </div>
                      )}
                      
                      {a.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic bg-gray-50 p-1 rounded">
                          &quot;{a.notes}&quot;
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STAGES.filter(s => s !== stage).slice(0, 4).map(s => (
                          <button 
                            key={s} 
                            onClick={() => move(a.id, s)} 
                            className={`text-[11px] px-2 py-0.5 rounded capitalize transition-colors ${
                              s === 'hired' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                              s === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                              s === 'interview' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                              s === 'screening' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                              'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {s}
                          </button>
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