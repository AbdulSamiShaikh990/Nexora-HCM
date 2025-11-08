"use client";
import { useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export default function JobsPage() {
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
    expiresAt: "",
    autoTemplate: true,
    externalPost: false,
  });
  const [testEnabled, setTestEnabled] = useState(false);
  const [passingPercent, setPassingPercent] = useState(70);
  const [questions, setQuestions] = useState<Array<{ id: string; text: string; options: string; correctAnswers: string }>>([]);

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
                questions: questions
                  .map(q => ({
                    id: q.id,
                    text: q.text,
                    options: q.options ? q.options.split(",").map(s => s.trim()).filter(Boolean) : undefined,
                    correctAnswers: q.correctAnswers ? q.correctAnswers.split(",").map(s => s.trim()).filter(Boolean) : [],
                  }))
                  .filter(q => q.text && (q.correctAnswers?.length ?? 0) > 0),
              }
            : { enabled: false },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create");
      setJobs((prev) => [data, ...prev]);
      setForm({ title: "", department: "", location: "", type: "", description: "", descriptionRich: "", expiresAt: "", autoTemplate: true, externalPost: false });
      setTestEnabled(false);
      setPassingPercent(70);
      setQuestions([]);
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
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Jobs</h1>

      <form onSubmit={createJob} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Short Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Rich Description (Markdown or HTML)" value={form.descriptionRich} onChange={(e) => setForm({ ...form, descriptionRich: e.target.value })} />
        <input type="date" className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-gray-900"><input type="checkbox" checked={form.autoTemplate} onChange={(e) => setForm({ ...form, autoTemplate: e.target.checked })} /> Auto Template</label>
          <label className="inline-flex items-center gap-2 text-gray-900"><input type="checkbox" checked={form.externalPost} onChange={(e) => setForm({ ...form, externalPost: e.target.checked })} /> External Post</label>
        </div>

        <div className="sm:col-span-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900">Test (optional)</div>
            <label className="inline-flex items-center gap-2 text-gray-900"><input type="checkbox" checked={testEnabled} onChange={(e) => setTestEnabled(e.target.checked)} /> Enable</label>
          </div>
          {testEnabled && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Passing %</label>
                <input type="number" min={0} max={100} className="border border-gray-300 rounded px-2 py-1 w-24 text-gray-900 bg-white" value={passingPercent} onChange={(e) => setPassingPercent(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={q.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder={`Question ${idx+1}`} value={q.text} onChange={(e) => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, text: e.target.value } : x))} />
                    <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="Options (comma separated, optional)" value={q.options} onChange={(e) => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, options: e.target.value } : x))} />
                    <input className="border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white sm:col-span-2" placeholder="Correct Answers (comma separated)" value={q.correctAnswers} onChange={(e) => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, correctAnswers: e.target.value } : x))} />
                    <div className="sm:col-span-2"><button type="button" className="text-xs text-red-600" onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}>Remove</button></div>
                  </div>
                ))}
                <button type="button" className="text-sm text-indigo-700" onClick={() => setQuestions(prev => [...prev, { id: crypto.randomUUID(), text: "", options: "", correctAnswers: "" }])}>+ Add Question</button>
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
                  <div className="font-medium text-gray-900">{j.title} <span className="text-xs px-2 py-0.5 rounded-full ml-2 bg-gray-100 text-gray-800">{j.status}</span></div>
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
