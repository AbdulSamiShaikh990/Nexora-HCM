"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Job { 
  id: string; 
  title: string;
  department?: string;
  location?: string;
}

interface Application {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateSkills?: string[];
  stage: "applied" | "screening" | "interview" | "hired" | "rejected";
  notes?: string | null;
  scorePercent?: number;
  passed?: boolean;
  job?: Job;
  createdAt: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      const [jr, ar] = await Promise.all([
        fetch("/api/recuirment/jobs"),
        fetch(appsUrl.toString()),
      ]);
      const [j, a] = await Promise.all([jr.json(), ar.json()]);
      if (!jr.ok) throw new Error(j?.error || "Failed to load jobs");
      if (!ar.ok) throw new Error(a?.error || "Failed to load applications");
      setJobs(j);
      // Hide ended applications from default list unless specifically filtering
      setApps((a as Application[]).filter(x => stageFilter || (x.stage !== "hired" && x.stage !== "rejected")));
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [stageFilter, q]);

  async function moveStage(appId: string, newStage: string) {
    const res = await fetch(`/api/recuirment/applications/${appId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to update");
    setApps((prev) => prev.map((a) => (a.id === appId ? data : a)));
  }

  async function sendFeedback(appId: string) {
    const text = feedbackText[appId]?.trim();
    if (!text) return;
    const res = await fetch("/api/recuirment/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: appId, by: "Admin", text }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to send feedback");
    setFeedbackText((prev) => ({ ...prev, [appId]: "" }));
  }

  const jobsMap = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach((j) => map.set(j.id, j));
    return map;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Professional Back Button */}
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
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Applications</h1>
            <p className="text-gray-600 mt-1">Manage and track candidate applications</p>
          </div>
        </div>

        {/* Professional Filters and Search */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Filter by Stage</label>
              <select 
                className="w-full border-0 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-3 text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                value={stageFilter} 
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Stages</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Applications</label>
              <input 
                className="w-full border-0 bg-white/70 backdrop-blur-lg rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                placeholder="Search by name, email, job..." 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Results</label>
              <div className="h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-semibold">
                  {apps.length} Application{apps.length !== 1 ? 's' : ''} Found
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* Applications List */}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <div className="text-sm text-gray-600">No applications found.</div>
          ) : (
            apps.map((a) => {
              const job = a.job || jobsMap.get(a.jobId);
              return (
                <div key={a.id} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {a.candidateName}
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                          a.stage === "hired" ? "bg-green-100 text-green-800" :
                          a.stage === "rejected" ? "bg-red-100 text-red-800" :
                          a.stage === "interview" ? "bg-blue-100 text-blue-800" :
                          a.stage === "screening" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {a.stage}
                        </span>
                        {typeof a.scorePercent === 'number' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                            a.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {a.scorePercent}% {a.passed ? "✓" : "✗"}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        Applied for: {job?.title || `Job #${a.jobId}`}
                      </div>
                      
                      {a.candidateEmail && (
                        <div className="text-sm text-gray-600">📧 {a.candidateEmail}</div>
                      )}
                      
                      {a.candidatePhone && (
                        <div className="text-sm text-gray-600">📱 {a.candidatePhone}</div>
                      )}
                      
                      {a.candidateSkills && a.candidateSkills.length > 0 && (
                        <div className="text-sm text-gray-600">
                          🔧 Skills: {a.candidateSkills.join(", ")}
                        </div>
                      )}
                      
                      {a.notes && (
                        <div className="text-sm mt-1 text-gray-900">Notes: {a.notes}</div>
                      )}

                      {/* Stage Actions */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.stage === "applied" && (
                          <button 
                            onClick={() => moveStage(a.id, "screening")} 
                            className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                          >
                            Screen
                          </button>
                        )}
                        {a.stage === "screening" && (
                          <button 
                            onClick={() => moveStage(a.id, "interview")} 
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Interview
                          </button>
                        )}
                        {a.stage === "interview" && (
                          <button 
                            onClick={() => moveStage(a.id, "hired")} 
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >
                            Hire
                          </button>
                        )}
                        {(a.stage === "applied" || a.stage === "screening" || a.stage === "interview") && (
                          <button 
                            onClick={() => moveStage(a.id, "rejected")} 
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        )}
                      </div>

                      {/* Feedback */}
                      <div className="mt-3 flex gap-2">
                        <input 
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 placeholder:text-gray-500 bg-white" 
                          placeholder="Send feedback to candidate..." 
                          value={feedbackText[a.id] || ""} 
                          onChange={(e) => setFeedbackText(prev => ({ ...prev, [a.id]: e.target.value }))} 
                        />
                        <button 
                          onClick={() => sendFeedback(a.id)} 
                          className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-black"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}