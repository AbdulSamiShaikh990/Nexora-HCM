"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  text: string;
  type?: string;
  options?: string[];
  correctAnswers?: string[];
  category?: string;
}

interface Job {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  description?: string;
  descriptionRich?: string;
  status: string;
  testEnabled?: boolean;
  testPassingPercent?: number;
  test?: {
    enabled: boolean;
    passingPercent: number;
    questions: Question[];
  };
  expiresAt?: string;
}

export default function PublicJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
  });
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  useEffect(() => {
    loadJob();
  }, [jobId]);
  
  async function loadJob() {
    try {
      setLoading(true);
      const res = await fetch(`/api/recuirment/jobs/${jobId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Job not found");
      }
      
      if (data.status === "closed") {
        setError("This job posting is closed and no longer accepting applications.");
        return;
      }
      
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setError("This job posting has expired and is no longer accepting applications.");
        return;
      }
      
      setJob(data);
    } catch (err: any) {
      setError(err.message || "Failed to load job");
    } finally {
      setLoading(false);
    }
  }
  
  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    
    if (!candidateForm.name.trim()) {
      alert("Please enter your name");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer: answer.trim()
      }));
      
      const res = await fetch("/api/recuirment/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: parseInt(jobId),
          candidateName: candidateForm.name.trim(),
          candidateEmail: candidateForm.email.trim() || null,
          candidatePhone: candidateForm.phone.trim() || null,
          candidateSkills: candidateForm.skills.trim() ? candidateForm.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
          answers: formattedAnswers,
          stage: "applied"
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }
      
      setSubmitted(true);
      
    } catch (err: any) {
      alert(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Available</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push("/")} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for applying to <strong>{job?.title}</strong>. 
            We have received your application and will review it shortly.
          </p>
          {job?.testEnabled && (
            <p className="text-sm text-gray-500 mb-6">
              Your assessment will be evaluated and you will be notified of the results.
            </p>
          )}
          <button 
            onClick={() => router.push("/")} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }
  
  const testQuestions = job?.test?.enabled ? job.test.questions : [];
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Job Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{job?.title}</h1>
            <div className="flex flex-wrap justify-center gap-4 text-gray-600 mb-6">
              {job?.department && (
                <span className="flex items-center gap-2">
                  🏢 {job.department}
                </span>
              )}
              {job?.location && (
                <span className="flex items-center gap-2">
                  📍 {job.location}
                </span>
              )}
              {job?.type && (
                <span className="flex items-center gap-2">
                  💼 {job.type}
                </span>
              )}
            </div>
            
            {job?.description && (
              <div className="text-gray-700 mb-6 leading-relaxed">
                {job.description}
              </div>
            )}
            
            {job?.descriptionRich && (
              <div 
                className="text-gray-700 leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: job.descriptionRich }}
              />
            )}
          </div>
        </div>
        
        {/* Application Form */}
        <form onSubmit={submitApplication} className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply for this Position</h2>
          
          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="Enter your full name"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input 
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="your.email@example.com"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input 
                  type="tel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="+1 (555) 123-4567"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                  placeholder="React, JavaScript, Node.js (comma separated)"
                  value={candidateForm.skills}
                  onChange={(e) => setCandidateForm({ ...candidateForm, skills: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          {/* Assessment Questions */}
          {testQuestions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assessment Questions
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Passing score: {job?.test?.passingPercent || 60}%)
                </span>
              </h3>
              
              <div className="space-y-6">
                {testQuestions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {idx + 1}. {q.text}
                    </h4>
                    
                    {q.category && (
                      <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 mb-3 capitalize">
                        {q.category}
                      </span>
                    )}
                    
                    {q.type === "multiple-choice" && q.options ? (
                      <div className="space-y-2">
                        {q.options.map((option, optIdx) => (
                          <label key={optIdx} className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="radio"
                              name={q.id}
                              value={option}
                              checked={answers[q.id] === option}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                              className="text-indigo-600"
                            />
                            <span className="text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                        rows={3}
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="text-center">
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}