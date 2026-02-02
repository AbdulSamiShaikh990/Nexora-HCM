"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateQuestionTemplate, getDefaultQuestions, type Question } from "@/lib/questionTemplates";

interface Job {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  descriptionRich?: string | null;
  status: "open" | "closed";
  testEnabled?: boolean;
  test?: {
    enabled: boolean;
    passingPercent: number;
    questions: Question[];
  };
  questionTemplate?: Question[];
  createdAt: string;
  updatedAt: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    type: "",
    description: "",
    descriptionRich: "",
    skills: "",
    expiresAt: "",
    autoTemplate: true,
    externalPost: false,
  });
  const [testEnabled, setTestEnabled] = useState(true); // Default to true
  const [passingPercent, setPassingPercent] = useState(60);
  const [questions, setQuestions] = useState<Question[]>(getDefaultQuestions());
  const [useCustomQuestions, setUseCustomQuestions] = useState(false);

  // Generate questions based on job title and description
  function generateQuestions() {
    const generatedQuestions = generateQuestionTemplate(form.title, form.description);
    setQuestions(generatedQuestions);
    setUseCustomQuestions(false);
  }

  // Update questions when title or description changes (if not using custom questions)
  useEffect(() => {
    if (!useCustomQuestions && (form.title || form.description)) {
      const generatedQuestions = generateQuestionTemplate(form.title, form.description);
      setQuestions(generatedQuestions);
    }
  }, [form.title, form.description, useCustomQuestions]);

  function share(job: Job, platform: "linkedin" | "facebook" | "x" | "whatsapp" | "copy") {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/jobs/${job.id}`; // placeholder public URL
    const text = `We're hiring: ${job.title}${job.location ? ` in ${job.location}` : ""}. Apply now!`;
    if (platform === "copy") {
      navigator.clipboard?.writeText(`${text} ${link}`);
      alert("Link copied to clipboard");
      return;
    }
    let url = "";
    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case "x":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        break;
      case "whatsapp":
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + link)}`;
        break;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recuirment/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setJobs(data);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/recuirment/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          department: form.department || undefined,
          location: form.location || undefined,
          type: form.type || undefined,
          description: form.description || undefined,
          descriptionRich: form.descriptionRich || undefined,
          expiresAt: form.expiresAt || undefined,
          autoTemplate: form.autoTemplate,
          externalPost: form.externalPost,
          test: testEnabled
            ? {
                enabled: true,
                passingPercent,
                questions: useCustomQuestions ? questions : undefined // Send custom questions only if manually edited
              }
            : { enabled: false },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create");
      setJobs((prev) => [data, ...prev]);
      setForm({ title: "", department: "", location: "", type: "", description: "", descriptionRich: "", skills: "", expiresAt: "", autoTemplate: true, externalPost: false });
      setTestEnabled(true);
      setPassingPercent(60);
      setQuestions(getDefaultQuestions());
      setUseCustomQuestions(false);
    } catch (e: any) {
      alert(e.message || "Error");
    }
  }

  async function closeJob(id: string) {
    const res = await fetch(`/api/recuirment/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data?.error || "Failed to update");
    setJobs((prev) => prev.map((j) => (j.id === id ? data : j)));
  }

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Jobs</h1>
      </div>

      <form onSubmit={createJob} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Required Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Short Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Rich Description (Markdown or HTML)" value={form.descriptionRich} onChange={(e) => setForm({ ...form, descriptionRich: e.target.value })} />
        <input type="date" className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-gray-900"><input type="checkbox" checked={form.autoTemplate} onChange={(e) => setForm({ ...form, autoTemplate: e.target.checked })} /> Auto Template</label>
          <label className="inline-flex items-center gap-2 text-gray-900"><input type="checkbox" checked={form.externalPost} onChange={(e) => setForm({ ...form, externalPost: e.target.checked })} /> External Post</label>
        </div>

        <div className="sm:col-span-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900">Assessment Questions</div>
            <label className="inline-flex items-center gap-2 text-gray-900">
              <input type="checkbox" checked={testEnabled} onChange={(e) => setTestEnabled(e.target.checked)} />
              Enable Assessment
            </label>
          </div>
          {testEnabled && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Passing %</label>
                <input 
                  type="number" 
                  min={0} 
                  max={100} 
                  className="border border-gray-300 rounded px-2 py-1 w-24 text-gray-900 bg-white" 
                  value={passingPercent} 
                  onChange={(e) => setPassingPercent(Number(e.target.value))} 
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Generated Questions (Based on Job Role)</h4>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={generateQuestions}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Regenerate
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setUseCustomQuestions(!useCustomQuestions)}
                      className={`text-xs px-3 py-1 rounded ${
                        useCustomQuestions 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {useCustomQuestions ? 'Use Template' : 'Custom Edit'}
                    </button>
                  </div>
                </div>
                
                {!useCustomQuestions ? (
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="border border-blue-200 bg-white p-2 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              Q{idx+1} ({q.category}): {q.text}
                            </div>
                            {q.options && (
                              <div className="text-xs text-gray-600 mt-1">
                                Options: {q.options.join(", ")}
                              </div>
                            )}
                            {q.correctAnswers && q.correctAnswers.length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                Expected: {q.correctAnswers.join(", ")}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            q.category === 'personal' ? 'bg-purple-100 text-purple-800' :
                            q.category === 'technical' ? 'bg-blue-100 text-blue-800' :
                            q.category === 'behavioral' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {q.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="grid grid-cols-1 gap-2">
                        <input 
                          className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" 
                          placeholder={`Question ${idx+1}`} 
                          value={q.text} 
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[idx] = { ...q, text: e.target.value };
                            setQuestions(newQuestions);
                          }}
                        />
                        {q.type === 'multiple-choice' && (
                          <input 
                            className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" 
                            placeholder="Options (comma separated)" 
                            value={q.options?.join(", ") || ""} 
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx] = { 
                                ...q, 
                                options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) 
                              };
                              setQuestions(newQuestions);
                            }}
                          />
                        )}
                        {q.correctAnswers && (
                          <input 
                            className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" 
                            placeholder="Correct Answers (comma separated)" 
                            value={q.correctAnswers.join(", ")} 
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx] = { 
                                ...q, 
                                correctAnswers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) 
                              };
                              setQuestions(newQuestions);
                            }}
                          />
                        )}
                        <div className="flex justify-between">
                          <select 
                            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                            value={q.category}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[idx] = { ...q, category: e.target.value as any };
                              setQuestions(newQuestions);
                            }}
                          >
                            <option value="personal">Personal</option>
                            <option value="technical">Technical</option>
                            <option value="behavioral">Behavioral</option>
                            <option value="custom">Custom</option>
                          </select>
                          <button 
                            type="button" 
                            className="text-xs text-red-600 hover:text-red-800" 
                            onClick={() => {
                              const newQuestions = questions.filter((_, i) => i !== idx);
                              setQuestions(newQuestions);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      className="text-sm text-indigo-700 hover:text-indigo-900" 
                      onClick={() => {
                        const newQuestion: Question = {
                          id: crypto.randomUUID(),
                          text: "",
                          type: "text",
                          category: "custom"
                        };
                        setQuestions([...questions, newQuestion]);
                      }}
                    >
                      + Add Question
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 sm:col-span-2">Create Job</button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-sm text-gray-600">No jobs yet.</div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900">
                    {j.title} 
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                      j.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {j.status}
                    </span>
                    {j.testEnabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full ml-2 bg-blue-100 text-blue-800">
                        Assessment Enabled ({j.test?.questions?.length || 0} questions)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">{j.department || "-"} • {j.location || "-"} • {j.type || "-"}</div>
                  {j.description ? <div className="text-sm mt-1 text-gray-900">{j.description}</div> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-900">Share:</span>
                    <button type="button" onClick={() => share(j, "linkedin")} className="text-xs rounded px-2 py-1 bg-[#0A66C2] text-white hover:brightness-110">LinkedIn</button>
                    <button type="button" onClick={() => share(j, "facebook")} className="text-xs rounded px-2 py-1 bg-[#1877F2] text-white hover:brightness-110">Facebook</button>
                    <button type="button" onClick={() => share(j, "x")} className="text-xs rounded px-2 py-1 bg-black text-white hover:brightness-110">X</button>
                    <button type="button" onClick={() => share(j, "whatsapp")} className="text-xs rounded px-2 py-1 bg-[#25D366] text-white hover:brightness-110">WhatsApp</button>
                    <button type="button" onClick={() => share(j, "copy")} className="text-xs rounded px-2 py-1 bg-gray-800 text-white hover:bg-black">Copy Link</button>
                  </div>
                </div>
                {j.status === "open" && (
                  <button onClick={() => closeJob(j.id)} className="text-sm bg-gray-800 hover:bg-black text-white rounded px-3 py-1">Close</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
