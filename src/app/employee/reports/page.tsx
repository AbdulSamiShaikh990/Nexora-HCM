"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  Download, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { LineChart as RechartsLine, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = "attendance" | "task" | "leave" | "performance";
type TimeRange = "week" | "month" | "year";

interface ReportData {
  attendance?: any;
  task?: any;
  leave?: any;
  performance?: any;
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("attendance");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: ""
  });

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, timeRange, customDateRange.start, customDateRange.end]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let url = `/api/employees/reports/${selectedReport}?range=${timeRange}`;
      
      // Add custom dates if provided
      if (customDateRange.start) {
        url += `&startDate=${customDateRange.start}`;
      }
      if (customDateRange.end) {
        url += `&endDate=${customDateRange.end}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(prev => ({ ...prev, [selectedReport]: data }));
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentData = reportData[selectedReport];
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22);
    doc.text(`${selectedReport.toUpperCase()} REPORT`, 14, 20);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Period: ${timeRange}`, 14, 34);
    
    // Add content based on report type
    if (selectedReport === "attendance" && currentData) {
      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Status', 'Hours', 'Check In', 'Check Out']],
        body: currentData.records?.map((r: any) => [
          new Date(r.date).toLocaleDateString(),
          r.status,
          r.hoursWorked || 'N/A',
          r.checkIn || 'N/A',
          r.checkOut || 'N/A'
        ]) || []
      });
    } else if (selectedReport === "task" && currentData) {
      autoTable(doc, {
        startY: 40,
        head: [['Task', 'Status', 'Priority', 'Due Date']],
        body: currentData.tasks?.map((t: any) => [
          t.title,
          t.status,
          t.priority,
          new Date(t.dueDate).toLocaleDateString()
        ]) || []
      });
    } else if (selectedReport === "leave" && currentData) {
      autoTable(doc, {
        startY: 40,
        head: [['Type', 'Start Date', 'End Date', 'Status', 'Days']],
        body: currentData.leaves?.map((l: any) => [
          l.type,
          new Date(l.startDate).toLocaleDateString(),
          new Date(l.endDate).toLocaleDateString(),
          l.status,
          l.days
        ]) || []
      });
    } else if (selectedReport === "performance" && currentData) {
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Current', 'Target', 'Status']],
        body: [
          ['Task Completion', `${currentData.taskCompletion}%`, '90%', currentData.taskCompletion >= 90 ? '✓' : '✗'],
          ['Attendance Rate', `${currentData.attendanceRate}%`, '95%', currentData.attendanceRate >= 95 ? '✓' : '✗'],
          ['Quality Score', `${currentData.qualityScore}%`, '85%', currentData.qualityScore >= 85 ? '✓' : '✗']
        ]
      });
    }
    
    doc.save(`${selectedReport}-report-${new Date().getTime()}.pdf`);
  };

  const exportToCSV = () => {
    const currentData = reportData[selectedReport];
    let csvContent = "";
    
    if (selectedReport === "attendance" && currentData) {
      csvContent = "Date,Status,Hours,Check In,Check Out\n";
      currentData.records?.forEach((r: any) => {
        csvContent += `${new Date(r.date).toLocaleDateString()},${r.status},${r.hoursWorked || 'N/A'},${r.checkIn || 'N/A'},${r.checkOut || 'N/A'}\n`;
      });
    } else if (selectedReport === "task" && currentData) {
      csvContent = "Task,Status,Priority,Due Date\n";
      currentData.tasks?.forEach((t: any) => {
        csvContent += `${t.title},${t.status},${t.priority},${new Date(t.dueDate).toLocaleDateString()}\n`;
      });
    } else if (selectedReport === "leave" && currentData) {
      csvContent = "Type,Start Date,End Date,Status,Days\n";
      currentData.leaves?.forEach((l: any) => {
        csvContent += `${l.type},${new Date(l.startDate).toLocaleDateString()},${new Date(l.endDate).toLocaleDateString()},${l.status},${l.days}\n`;
      });
    } else if (selectedReport === "performance" && currentData) {
      csvContent = "Metric,Current,Target\n";
      csvContent += `Task Completion,${currentData.taskCompletion}%,90%\n`;
      csvContent += `Attendance Rate,${currentData.attendanceRate}%,95%\n`;
      csvContent += `Quality Score,${currentData.qualityScore}%,85%\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-report-${new Date().getTime()}.csv`;
    a.click();
  };

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-orange-100/50 rounded-full p-4 mb-4">
        <FileText className="w-12 h-12 text-orange-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
      <p className="text-gray-500 text-center max-w-md">{message}</p>
      <p className="text-sm text-gray-400 mt-2">Try selecting a different time range</p>
    </div>
  );

  const reportTypes = [
    { id: "attendance", name: "Attendance", icon: Clock, color: "orange" },
    { id: "task", name: "Tasks", icon: CheckCircle2, color: "orange" },
    { id: "leave", name: "Leaves", icon: Calendar, color: "orange" },
    { id: "performance", name: "Performance", icon: TrendingUp, color: "orange" }
  ];

  const renderAttendanceReport = () => {
    const data = reportData.attendance;
    if (!data) return <EmptyState message="No attendance data available" />;

    const chartData = data.chartData || [];
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-md border border-orange-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Working Days</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalWorkingDays || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-md border border-yellow-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Late</p>
                <p className="text-2xl font-bold text-gray-900">{data.lateDays || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-md border border-blue-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Half-Day</p>
                <p className="text-2xl font-bold text-gray-900">{data.halfDays || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-md border border-red-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Absent</p>
                <p className="text-2xl font-bold text-gray-900">{data.absentDays || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-md border border-green-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.attendanceRate || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLine data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f97316" opacity={0.1} />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
            </RechartsLine>
          </ResponsiveContainer>
        </div>

        {/* Records Table */}
        <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Records (All Days)</h3>
          {data.records && data.records.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-200/30 bg-orange-50/50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Day</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Check In</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Check Out</th>
                </tr>
              </thead>
              <tbody>
                {data.records?.map((record: any, index: number) => {
                  const date = new Date(record.date);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const isWeekend = record.status === 'Weekend';
                  
                  return (
                    <tr key={index} className={`border-b border-orange-100/20 transition-colors ${
                      isWeekend ? 'bg-gray-50/50' : 'hover:bg-orange-50/30'
                    }`}>
                      <td className="py-3 px-4 font-medium text-gray-900">{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="py-3 px-4 text-gray-700">{dayName}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status?.toLowerCase() === 'present' ? 'bg-green-100 text-green-800' :
                          record.status?.toLowerCase() === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status?.toLowerCase() === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          record.status?.toLowerCase() === 'half-day' || record.status?.toLowerCase() === 'halfday' ? 'bg-blue-100 text-blue-800' :
                          record.status?.toLowerCase() === 'weekend' ? 'bg-gray-200 text-gray-700' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{record.hoursWorked ? `${record.hoursWorked}h` : '-'}</td>
                      <td className="py-3 px-4 text-gray-900">{record.checkIn || '-'}</td>
                      <td className="py-3 px-4 text-gray-900">{record.checkOut || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No attendance records found for the selected period</p>
          )}
        </div>
      </div>
    );
  };

  const renderTaskReport = () => {
    const data = reportData.task;
    if (!data) return <EmptyState message="No task data available for the selected period" />;

    const statusData = [
      { name: 'Completed', value: data.completedTasks || 0, color: '#10b981' },
      { name: 'In Progress', value: data.inProgressTasks || 0, color: '#f59e0b' },
      { name: 'Pending', value: data.pendingTasks || 0, color: '#6b7280' },
      { name: 'Overdue', value: data.overdueTasks || 0, color: '#ef4444' }
    ];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-md border border-orange-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalTasks || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-md border border-green-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{data.completedTasks || 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-md border border-yellow-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{data.inProgressTasks || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 backdrop-blur-md border border-gray-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{data.pendingTasks || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-md border border-red-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{data.overdueTasks || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate</h3>
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <div className="text-6xl font-bold text-orange-500">{data.completionRate || 0}%</div>
                <p className="text-gray-600 mt-2">Task Completion Rate</p>
                <p className="text-sm text-gray-500 mt-1">{data.completedTasks || 0} of {data.totalTasks || 0} tasks completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-orange-200/30">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Task</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Priority</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks?.map((task: any, index: number) => (
                <tr key={index} className="border-b border-orange-100/20 hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-900">{task.title}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'InProgress' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status === 'InProgress' ? 'In Progress' : task.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">{new Date(task.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLeaveReport = () => {
    const data = reportData.leave;
    if (!data) return <EmptyState message="No leave data available for the selected period" />;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-md border border-orange-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Total Leaves</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalLeaves || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-md border border-green-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{data.approvedLeaves || 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-md border border-yellow-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{data.pendingLeaves || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-md border border-red-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{data.rejectedLeaves || 0}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-md border border-blue-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Balance Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{data.remainingBalance ? `${data.remainingBalance} days` : '0 days'}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Status by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.balanceByType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f97316" opacity={0.1} />
                <XAxis dataKey="type" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(249, 115, 22, 0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#eab308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Breakdown by Type</h3>
            <div className="space-y-4 mt-2">
              {data.balanceByType?.length > 0 ? data.balanceByType?.map((item: any, index: number) => (
                <div key={index} className="p-4 bg-white/60 rounded-lg border border-orange-200/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold text-gray-900">{item.type}</span>
                    <span className="text-sm font-medium text-gray-600">Total: {item.total} day{item.total !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-2 bg-green-100/50 rounded-lg">
                      <span className="text-xs font-semibold text-green-700">Approved</span>
                      <span className="text-lg font-bold text-green-800">{item.approved}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-yellow-100/50 rounded-lg">
                      <span className="text-xs font-semibold text-yellow-700">Pending</span>
                      <span className="text-lg font-bold text-yellow-800">{item.pending}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-red-100/50 rounded-lg">
                      <span className="text-xs font-semibold text-red-700">Rejected</span>
                      <span className="text-lg font-bold text-red-800">{item.rejected}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No leave records found</p>
              )}
              
              {/* Summary row */}
              <div className="flex items-center justify-between p-3 bg-orange-100/50 rounded-lg border-t border-orange-200 mt-4">
                <span className="text-sm font-bold text-gray-900">Total Approved (Used)</span>
                <span className="text-lg font-bold text-orange-700">{data.totalUsedDays || 0} days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-100/50 rounded-lg">
                <span className="text-sm font-bold text-gray-900">Remaining Balance</span>
                <span className="text-lg font-bold text-green-700">{data.remainingBalance || 0} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Records */}
        <div className="bg-white/60 backdrop-blur-md border border-orange-100/50 rounded-xl p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Leave History</h3>
          {data.leaves?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-200/50">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">Start Date</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">End Date</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">Days</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">Reason</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.leaves?.map((leave: any, index: number) => (
                  <tr key={index} className="border-b border-orange-100/20 hover:bg-orange-50/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{leave.type}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{new Date(leave.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{new Date(leave.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">{leave.days} day{leave.days > 1 ? 's' : ''}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate">{leave.reason || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No leave records found</p>
          )}
        </div>
      </div>
    );
  };

  const renderPerformanceReport = () => {
    const data = reportData.performance;
    if (!data) return <EmptyState message="No performance data available for the selected period" />;

    // Use real performance trend data from API
    const performanceData = data.performanceTrend || [];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-md border border-orange-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Task Completion</p>
                <p className="text-2xl font-bold text-gray-900">{data.taskCompletion || 0}%</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-md border border-green-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.attendanceRate || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-md border border-blue-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Quality Score</p>
                <p className="text-2xl font-bold text-gray-900">{data.qualityScore || 0}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-md border border-purple-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalReviews || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend (Last 6 Months)</h3>
          {performanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLine data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f97316" opacity={0.1} />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="performance" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
            </RechartsLine>
          </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No performance trend data available</p>
          )}
        </div>

        {/* Feedback Section */}
        <div className="bg-white/40 backdrop-blur-md border border-orange-100/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manager Feedback</h3>
          <div className="space-y-4">
            {data.feedback?.map((item: any, index: number) => (
              <div key={index} className="bg-orange-50/50 rounded-lg p-4 border border-orange-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.manager}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-700 mt-2">{item.comment}</p>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.rating >= 4 ? 'bg-green-100 text-green-800' :
                      item.rating >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.rating}/5
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">Comprehensive personal performance reports</p>
        </div>
        
        {/* Export Options */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">PDF</span>
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-orange-200 text-gray-700 rounded-lg hover:bg-orange-50 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur-md border border-orange-300 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-gray-900 text-base">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full px-4 py-2 bg-white border border-orange-400 text-gray-800 font-medium rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Start Date</label>
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 bg-white border border-orange-400 text-gray-800 font-medium rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">End Date</label>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 bg-white border border-orange-400 text-gray-800 font-medium rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id as ReportType)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedReport === report.id
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600 text-white shadow-lg'
                  : 'bg-white/40 backdrop-blur-md border-orange-100/50 text-gray-700 hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              <Icon className={`w-8 h-8 mb-2 mx-auto ${selectedReport === report.id ? 'text-white' : 'text-orange-500'}`} />
              <p className="text-sm font-semibold">{report.name}</p>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {selectedReport === "attendance" && renderAttendanceReport()}
            {selectedReport === "task" && renderTaskReport()}
            {selectedReport === "leave" && renderLeaveReport()}
            {selectedReport === "performance" && renderPerformanceReport()}
          </>
        )}
      </div>
    </div>
  );
}
