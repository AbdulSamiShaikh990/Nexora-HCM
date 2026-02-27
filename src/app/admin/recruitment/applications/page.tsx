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
      setApps(a as Application[]);
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
    setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, stage: newStage as Application["stage"] } : a)));
  }

  async function sendFeedback(appId: string) {
    const text = feedbackText[appId]?.trim();
    if (!text) return;
    const res = await fetch("/api/recuirment/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: appId, by: "admin", text }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to send feedback");
    setFeedbackText(prev => ({ ...prev, [appId]: "" }));
    alert("Feedback sent!");
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

        {/* Professional Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="text-red-600 text-lg font-medium">{error}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {apps.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Found</h3>
                <p className="text-gray-600">Applications from job postings will appear here automatically.</p>
              </div>
            ) : (
              apps.map((a) => {
                const job = a.job || jobsMap.get(a.jobId);
                const stageColor = {
                  applied: "bg-gray-500",
                  screening: "bg-yellow-500", 
                  interview: "bg-blue-500",
                  hired: "bg-green-500",
                  rejected: "bg-red-500"
                }[a.stage] || "bg-gray-500";

                return (
                  <div key={a.id} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Candidate Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{a.candidateName}</h3>
                            <p className="text-sm text-gray-600">{job?.title || "Unknown Position"}</p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${stageColor}`}>
                            {a.stage.charAt(0).toUpperCase() + a.stage.slice(1)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {a.candidateEmail && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">📧</span>
                              <span className="text-gray-700">{a.candidateEmail}</span>
                            </div>
                          )}
                          {a.candidatePhone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">📱</span>
                              <span className="text-gray-700">{a.candidatePhone}</span>
                            </div>
                          )}
                          {a.candidateSkills && a.candidateSkills.length > 0 && (
                            <div className="md:col-span-2">
                              <span className="text-gray-500">🔧 Skills: </span>
                              <div className="inline-flex flex-wrap gap-1 mt-1">
                                {a.candidateSkills.map((skill, idx) => (
                                  <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {(a.scorePercent !== null && a.scorePercent !== undefined) && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">📊</span>
                              <span className={`font-medium ${a.passed ? 'text-green-600' : 'text-red-600'}`}>
                                {a.scorePercent}% {a.passed ? '✅' : '❌'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {a.notes && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-sm text-gray-700">{a.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="flex flex-wrap gap-2">
                          {a.stage === "applied" && (
                            <button 
                              onClick={() => moveStage(a.id, "screening")} 
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-yellow-600 hover:to-orange-600 transition-all"
                            >
                              🔍 Screen
                            </button>
                          )}
                          {a.stage === "screening" && (
                            <button 
                              onClick={() => moveStage(a.id, "interview")} 
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-all"
                            >
                              💬 Interview
                            </button>
                          )}
                          {a.stage === "interview" && (
                            <button 
                              onClick={() => moveStage(a.id, "hired")} 
                              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
                            >
                              ✅ Hire
                            </button>
                          )}
                          {(a.stage === "applied" || a.stage === "screening" || a.stage === "interview") && (
                            <button 
                              onClick={() => moveStage(a.id, "rejected")} 
                              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-red-600 hover:to-pink-600 transition-all"
                            >
                              ❌ Reject
                            </button>
                          )}
                        </div>

                        {/* Feedback */}
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 border-0 bg-white/70 backdrop-blur-lg rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all" 
                            placeholder="Send feedback..." 
                            value={feedbackText[a.id] || ""} 
                            onChange={(e) => setFeedbackText(prev => ({ ...prev, [a.id]: e.target.value }))} 
                          />
                          <button 
                            onClick={() => sendFeedback(a.id)} 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                          >
                            📤 Send
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
    </div>
  );
}