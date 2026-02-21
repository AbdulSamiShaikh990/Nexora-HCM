'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  salary: number | null;
  performanceRating: number | null;
  status: string;
}

interface AttritionPrediction {
  employee_id: string;
  employee_name: string;
  jobTitle?: string;
  salary?: number;
  performanceRating?: number;
  risk_score: number;
  risk_percentage: number;
  risk_category: string; // "Low-risk" | "Medium-risk" | "High-risk"
  risk_level?: 'High' | 'Medium' | 'Low'; // Mapped from risk_category
  attrition_risk?: number; // Calculated percentage
  factors: string[];
  prediction_details?: {
    salary: number;
    performance_rating: number;
    department: string;
    job_title: string;
  };
}

export default function AttritionDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [predictions, setPredictions] = useState<AttritionPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });

  // Fetch employees on load
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const analyzeAttrition = async (employeeId?: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/attrition/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeId ? { employeeId } : {}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch predictions');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      // Handle different response formats
      let predictionsList = [];
      if (Array.isArray(data)) {
        predictionsList = data;
      } else if (Array.isArray(data.predictions)) {
        predictionsList = data.predictions;
      } else if (data.data && Array.isArray(data.data)) {
        predictionsList = data.data;
      } else if (data.predictions && !Array.isArray(data.predictions)) {
        // Single prediction - convert to array
        predictionsList = [data.predictions];
      }

      console.log('Predictions List:', predictionsList); // Debug

      if (predictionsList.length === 0) {
        setError('No predictions received from API. Check console for details.');
        return;
      }

      // Map risk_category to risk_level
      const mappedPredictions = predictionsList.map((p: any) => ({
        ...p,
        risk_level: p.risk_category?.includes('High') ? 'High' : 
                    p.risk_category?.includes('Medium') ? 'Medium' : 'Low',
        attrition_risk: Math.round(p.risk_percentage || p.risk_score * 100),
        salary: p.prediction_details?.salary || 0,
        performanceRating: p.prediction_details?.performance_rating || 0,
        jobTitle: p.prediction_details?.job_title || ''
      }));

      setPredictions(mappedPredictions);

      // Calculate statistics
      const high = mappedPredictions.filter((p: any) => p.risk_level === 'High').length;
      const medium = mappedPredictions.filter((p: any) => p.risk_level === 'Medium').length;
      const low = mappedPredictions.filter((p: any) => p.risk_level === 'Low').length;

      setStats({
        total: mappedPredictions.length,
        high,
        medium,
        low,
      });
    } catch (err: any) {
      console.error('Attrition Error:', err); // Debug log
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Attrition Risk Analysis
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    AI-powered predictions to identify employees at risk of leaving
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Model Accuracy</p>
                <p className="text-lg font-bold text-blue-700">84%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats & Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Employee Count Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Employees</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">
                  {loadingEmployees ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    employees.length
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Active in database
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Ready to Analyze?</h3>
              <p className="text-indigo-100 mb-6">
                Run AI predictions on all {employees.length} employees to identify retention risks
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  analyzeAttrition();
                }}
                disabled={loading || employees.length === 0}
                className={`group px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                  loading || employees.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 shadow-2xl hover:shadow-indigo-500/50'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Analyze All Employees
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-5 shadow-md animate-shake">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-800 text-lg">Error Occurred</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Current Employees Table */}
        {!loading && predictions.length === 0 && employees.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Current Employees</h2>
              <p className="text-indigo-100 text-sm mt-2">Employees available for attrition analysis</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Job Title</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Salary</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-sm">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{emp.jobTitle}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">
                          {emp.salary ? `Rs ${emp.salary.toLocaleString()}` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {emp.performanceRating ? (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < emp.performanceRating! ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{emp.performanceRating}/5</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            analyzeAttrition(emp.id);
                          }}
                          disabled={loading}
                          className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                          {loading ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            '🔍 Analyze'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Predictions Results - Only show when predictions exist */}
        {predictions.length > 0 && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-600 text-sm font-bold uppercase tracking-wide">Total Analyzed</p>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-5xl font-black text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-3 font-medium">Employees scanned</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-lg border-2 border-red-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-red-700 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <span className="text-2xl">🔴</span> High Risk
                  </p>
                </div>
                <p className="text-5xl font-black text-red-700">{stats.high}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-red-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full transition-all duration-500"
                      style={{width: `${stats.total > 0 ? (stats.high / stats.total * 100) : 0}%`}}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-red-700">
                    {stats.total > 0 ? Math.round(stats.high / stats.total * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Immediate attention needed</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-2xl shadow-lg border-2 border-yellow-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-yellow-700 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <span className="text-2xl">🟡</span> Medium Risk
                  </p>
                </div>
                <p className="text-5xl font-black text-yellow-700">{stats.medium}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-yellow-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                      style={{width: `${stats.total > 0 ? (stats.medium / stats.total * 100) : 0}%`}}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-yellow-700">
                    {stats.total > 0 ? Math.round(stats.medium / stats.total * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-yellow-600 mt-2 font-semibold">📊 Monitor closely</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-lg border-2 border-green-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-green-700 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                    <span className="text-2xl">🟢</span> Low Risk
                  </p>
                </div>
                <p className="text-5xl font-black text-green-700">{stats.low}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{width: `${stats.total > 0 ? (stats.low / stats.total * 100) : 0}%`}}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-green-700">
                    {stats.total > 0 ? Math.round(stats.low / stats.total * 100) : 0}%
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-2 font-semibold">✅ Stable employees</p>
              </div>
            </div>

            {/* Predictions List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    📊 Detailed Risk Analysis
                  </h2>
                </div>
                <button
                  onClick={() => setPredictions([])}
                  className="px-5 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors flex items-center gap-2 border border-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Results
                </button>
              </div>

              {/* High Risk Section */}
              {stats.high > 0 && (
                <div className="bg-white rounded-lg shadow-md border-2 border-red-200 overflow-hidden">
                  <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                      <span className="text-2xl">🔴</span> High Risk Employees ({stats.high})
                    </h3>
                    <p className="text-sm text-red-600 mt-1">These employees need immediate retention strategies</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {predictions
                      .filter((pred) => pred.risk_level === 'High')
                      .map((pred, idx) => (
                        <EmployeeCard key={`high-${pred.employee_id}-${idx}`} prediction={pred} />
                      ))}
                  </div>
                </div>
              )}

              {/* Medium Risk Section */}
              {stats.medium > 0 && (
                <div className="bg-white rounded-lg shadow-md border-2 border-yellow-200 overflow-hidden">
                  <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-200">
                    <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                      <span className="text-2xl">🟡</span> Medium Risk Employees ({stats.medium})
                    </h3>
                    <p className="text-sm text-yellow-600 mt-1">Monitor these employees and address concerns</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {predictions
                      .filter((pred) => pred.risk_level === 'Medium')
                      .map((pred, idx) => (
                        <EmployeeCard key={`medium-${pred.employee_id}-${idx}`} prediction={pred} />
                      ))}
                  </div>
                </div>
              )}

              {/* Low Risk Section */}
              {stats.low > 0 && (
                <div className="bg-white rounded-lg shadow-md border-2 border-green-200 overflow-hidden">
                  <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                    <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                      <span className="text-2xl">🟢</span> Low Risk Employees ({stats.low})
                    </h3>
                    <p className="text-sm text-green-600 mt-1">These employees are stable and satisfied</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {predictions
                      .filter((pred) => pred.risk_level === 'Low')
                      .map((pred, idx) => (
                        <EmployeeCard key={`low-${pred.employee_id}-${idx}`} prediction={pred} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Employee Card Component
function EmployeeCard({ prediction }: { prediction: AttritionPrediction }) {
  const riskLevel = prediction.risk_level || 'Low';
  const riskPercentage = prediction.attrition_risk || Math.round(prediction.risk_percentage || 0);
  const salary = prediction.salary || prediction.prediction_details?.salary || 0;
  const performanceRating = prediction.performanceRating || prediction.prediction_details?.performance_rating || 0;
  const jobTitle = prediction.jobTitle || prediction.prediction_details?.job_title || 'N/A';
  const employeeName = prediction.employee_name || 'Unknown';
  const initials = employeeName.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA';

  const riskColor =
    riskLevel === 'High'
      ? 'from-red-50 to-red-100 border-red-400'
      : riskLevel === 'Medium'
      ? 'from-yellow-50 to-yellow-100 border-yellow-400'
      : 'from-green-50 to-green-100 border-green-400';

  const badgeColor =
    riskLevel === 'High'
      ? 'from-red-500 to-red-600'
      : riskLevel === 'Medium'
      ? 'from-yellow-500 to-yellow-600'
      : 'from-green-500 to-green-600';

  return (
    <div className={`bg-gradient-to-r ${riskColor} p-6 border-2 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-start gap-5 flex-1">
          {/* Avatar */}
          <div className="flex-shrink-0 h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/50">
            <span className="text-indigo-600 font-black text-xl">
              {initials}
            </span>
          </div>
          
          {/* Employee Info */}
          <div className="flex-1">
            <h4 className="font-black text-gray-900 text-2xl mb-1">
              {employeeName}
            </h4>
            <p className="text-gray-700 text-sm font-semibold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {jobTitle}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-md border border-gray-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Salary</p>
                  <p className="font-black text-gray-900 text-lg">Rs {salary.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-md border border-gray-200">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Performance</p>
                  <p className="font-black text-gray-900 text-lg">{performanceRating}/5</p>
                </div>
              </div>
            </div>
            {/* Risk Factors */}
            {prediction.factors && prediction.factors.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-600 font-bold mb-2 uppercase tracking-wide">Risk Factors:</p>
                <div className="flex flex-wrap gap-2">
                  {prediction.factors.map((factor, idx) => (
                    <span key={idx} className="text-xs bg-white px-3 py-1.5 rounded-lg border-2 border-gray-200 font-semibold text-gray-700 shadow-sm">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Risk Score Badge */}
        <div className="text-center">
          <div className={`bg-gradient-to-br ${badgeColor} px-8 py-6 rounded-2xl shadow-2xl ring-4 ring-white/50`}>
            <p className="text-5xl font-black text-white mb-2">
              {riskPercentage}%
            </p>
            <p className="text-xs font-black text-white uppercase tracking-wider">
              {riskLevel} Risk
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
