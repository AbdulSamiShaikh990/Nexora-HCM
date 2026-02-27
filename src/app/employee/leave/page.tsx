"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { leaveStyles } from "./styles";
import LeaveStats from "./LeaveStats";
import LeaveBalanceCard from "./LeaveBalance";
import QuickActions from "./QuickActions";
import LeaveRequestForm, { LeaveFormData } from "./LeaveRequestForm";
import LeaveHistory from "./LeaveHistory";
import LeaveCharts from "./LeaveCharts";
import LeaveCalendar from "./LeaveCalendar";
import TrendAnalysis from "./TrendAnalysis";
import LeaveNotifications, { LeaveNotification } from "./LeaveNotifications";

interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
  description: string;
}

interface LeaveRequest {
  id: string;
  leaveType: string;
  description: string;
  duration: number;
  startDate: string;
  endDate: string;
  appliedDate: string;
  status: "approved" | "pending" | "rejected";
  approvedBy?: string;
  approvalDate?: string;
  comments?: string;
}

export default function LeavePage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveStats, setLeaveStats] = useState({
    totalApplied: 0,
    approved: 0,
    pending: 0,
    activeRequests: 0,
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<LeaveNotification[]>([]);
  const [leaveDays, setLeaveDays] = useState<Array<{date: string; status: "approved" | "pending" | "rejected" | null; type: string}>>([]);
  const [trendData, setTrendData] = useState<Array<{month: string; approved: number; pending: number; rejected: number}>>([]);
  const [chartData, setChartData] = useState<Array<{type: string; count: number; percentage: number; color: string}>>([]);

  // Fetch all leave data from backend
  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/leave/employee");
        
        if (!response.ok) {
          throw new Error("Failed to fetch leave data");
        }

        const data = await response.json();
        
        // Update leave requests
        if (data.data && Array.isArray(data.data)) {
          const requests: LeaveRequest[] = data.data.map((item: any) => ({
            id: String(item.id),
            leaveType: item.type,
            description: item.reason || "-",
            duration: item.days,
            startDate: new Date(item.startDate).toLocaleDateString(),
            endDate: new Date(item.endDate).toLocaleDateString(),
            appliedDate: new Date().toLocaleDateString(),
            status: item.status === "Approved" ? "approved" : 
                    item.status === "Pending" ? "pending" : "rejected",
            approvedBy: item.approvedBy || undefined,
            comments: item.reason,
          }));
          setLeaveRequests(requests);

          // Calculate stats
          const approved = requests.filter(r => r.status === "approved").length;
          const pending = requests.filter(r => r.status === "pending").length;
          const totalDays = requests.reduce((sum, r) => sum + r.duration, 0);
          
          setLeaveStats({
            totalApplied: totalDays,
            approved,
            pending,
            activeRequests: pending,
          });

          // Calculate chart data
          const approvedCount = requests.filter(r => r.status === "approved").length;
          const pendingCount = requests.filter(r => r.status === "pending").length;
          const rejectedCount = requests.filter(r => r.status === "rejected").length;
          const total = Math.max(approvedCount + pendingCount + rejectedCount, 1);

          setChartData([
            { 
              type: "Approved", 
              count: approvedCount, 
              percentage: Math.round((approvedCount / total) * 100), 
              color: "green" 
            },
            { 
              type: "Pending", 
              count: pendingCount, 
              percentage: Math.round((pendingCount / total) * 100), 
              color: "yellow" 
            },
            { 
              type: "Rejected", 
              count: rejectedCount, 
              percentage: Math.round((rejectedCount / total) * 100), 
              color: "red" 
            },
          ]);

          // Prepare calendar data - expand to include all days in each leave range
          const calendarDays: Array<{date: string; status: "approved" | "pending" | "rejected" | null; type: string}> = [];
          data.data.forEach((item: any) => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            const status = item.status.toLowerCase();
            const type = item.type;
            
            // Add each day in the range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              calendarDays.push({
                date: d.toISOString().split('T')[0],
                status: (status === "approved" || status === "pending" || status === "rejected" ? status : null) as "approved" | "pending" | "rejected" | null,
                type: type,
              });
            }
          });
          setLeaveDays(calendarDays);

          // Calculate trend data (last 6 months)
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const now = new Date();
          const trends = [];
          
          for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
            
            const monthRequests = requests.filter(r => {
              const reqDate = new Date(r.appliedDate);
              return reqDate.getMonth() === targetDate.getMonth() && 
                     reqDate.getFullYear() === targetDate.getFullYear();
            });

            trends.push({
              month: monthKey,
              approved: monthRequests.filter(r => r.status === "approved").length,
              pending: monthRequests.filter(r => r.status === "pending").length,
              rejected: monthRequests.filter(r => r.status === "rejected").length,
            });
          }
          setTrendData(trends);

          // Generate notifications
          const notifs: LeaveNotification[] = [];
          
          // Recent approvals
          const recentApproved = requests.filter(r => r.status === "approved").slice(0, 2);
          recentApproved.forEach(r => {
            notifs.push({
              id: `approved-${r.id}`,
              title: "Leave Approved",
              message: `Your ${r.leaveType} from ${r.startDate} to ${r.endDate} has been approved`,
              type: "success",
              timestamp: "2 hours ago",
              read: false,
            });
          });

          // Recent rejections
          const recentRejected = requests.filter(r => r.status === "rejected").slice(0, 2);
          recentRejected.forEach(r => {
            notifs.push({
              id: `rejected-${r.id}`,
              title: "Leave Rejected",
              message: `Your ${r.leaveType} from ${r.startDate} to ${r.endDate} has been rejected`,
              type: "error",
              timestamp: "1 hour ago",
              read: false,
            });
          });

          // Pending requests
          const recentPending = requests.filter(r => r.status === "pending").slice(0, 2);
          recentPending.forEach(r => {
            notifs.push({
              id: `pending-${r.id}`,
              title: "Leave Request Pending",
              message: `Your ${r.leaveType} request from ${r.startDate} to ${r.endDate} is awaiting approval`,
              type: "pending",
              timestamp: "5 hours ago",
              read: false,
            });
          });

          setNotifications(notifs);

          // Calculate used leaves by type directly from requests
          const usedAnnual = requests.filter(r => r.leaveType.toLowerCase().includes('annual') && r.status === 'approved')
            .reduce((sum, r) => sum + r.duration, 0);
          const usedSick = requests.filter(r => r.leaveType.toLowerCase().includes('sick') && r.status === 'approved')
            .reduce((sum, r) => sum + r.duration, 0);
          const usedCasual = requests.filter(r => r.leaveType.toLowerCase().includes('casual') && r.status === 'approved')
            .reduce((sum, r) => sum + r.duration, 0);
          const usedEmergency = requests.filter(r => r.leaveType.toLowerCase().includes('emergency') && r.status === 'approved')
            .reduce((sum, r) => sum + r.duration, 0);

          // Get current month for monthly calculations
          const currentMonth = new Date().getMonth();
          const monthlyMultiplier = currentMonth + 1; // Months passed in year

          // Set leave balances regardless of employee API response
          setLeaveBalances([
            {
              type: "Annual Leave",
              total: 14,
              used: usedAnnual,
              remaining: Math.max(14 - usedAnnual, 0),
              description: "14 days per year",
            },
            {
              type: "Sick Leave",
              total: 3 * monthlyMultiplier,
              used: usedSick,
              remaining: Math.max((3 * monthlyMultiplier) - usedSick, 0),
              description: "3 days per month",
            },
            {
              type: "Casual Leave",
              total: 2 * monthlyMultiplier,
              used: usedCasual,
              remaining: Math.max((2 * monthlyMultiplier) - usedCasual, 0),
              description: "2 days per month",
            },
            {
              type: "Emergency Leave",
              total: 1 * monthlyMultiplier,
              used: usedEmergency,
              remaining: Math.max((1 * monthlyMultiplier) - usedEmergency, 0),
              description: "1 day per month",
            },
          ]);
        } else {
          // If no data from API, show default balances
          const currentMonth = new Date().getMonth();
          const monthlyMultiplier = currentMonth + 1;
          
          setLeaveBalances([
            {
              type: "Annual Leave",
              total: 14,
              used: 0,
              remaining: 14,
              description: "14 days per year",
            },
            {
              type: "Sick Leave",
              total: 3 * monthlyMultiplier,
              used: 0,
              remaining: 3 * monthlyMultiplier,
              description: "3 days per month",
            },
            {
              type: "Casual Leave",
              total: 2 * monthlyMultiplier,
              used: 0,
              remaining: 2 * monthlyMultiplier,
              description: "2 days per month",
            },
            {
              type: "Emergency Leave",
              total: 1 * monthlyMultiplier,
              used: 0,
              remaining: 1 * monthlyMultiplier,
              description: "1 day per month",
            },
          ]);
        }

      } catch (error) {
        console.error("Failed to fetch leave data:", error);
        // Keep default/empty data on error
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, []);

  const handleRequestLeave = () => {
    setIsFormOpen(true);
  };

  const handleViewCalendar = () => {
    // Scroll to calendar section
    const calendarSection = document.querySelector('[data-calendar]');
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleEmergency = () => {
    setIsFormOpen(true);
  };

  const handleFormSubmit = (formData: LeaveFormData) => {
    // The actual API call is now handled in LeaveRequestForm component
    // This function is kept for backward compatibility but the real work
    // is done in the submitLeaveRequest function in LeaveRequestForm.tsx
    console.log("Form submitted:", formData);
  };

  const handleEditRequest = (id: string) => {
    // TODO: Implement edit functionality
    console.log("Edit request:", id);
  };

  const handleCancelRequest = (id: string) => {
    // TODO: Implement cancel functionality
    setLeaveRequests(leaveRequests.filter((r) => r.id !== id));
    console.log("Cancel request:", id);
  };

  const handleViewDetails = (id: string) => {
    // TODO: Implement view details
    console.log("View details:", id);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={leaveStyles.container.base}>
      {/* Header - Task Page Style */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-3xl border border-orange-200 p-6 sm:p-8 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 rounded-2xl p-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600 mt-1">Manage your leave requests and track balance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/employee/dashboard'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-300 bg-white text-orange-700 font-medium hover:bg-orange-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <button
              onClick={handleRequestLeave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Request Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics - Leave Stats at Top */}
      <LeaveStats stats={leaveStats} />

      {/* Charts and Insights Section - Prominent Display */}
      <div className={leaveStyles.grid.main}>
        {/* Leave Distribution Chart - Large Display */}
        <div className="lg:col-span-2">
          <LeaveCharts data={chartData} />
        </div>

        {/* Top-right: Quick Actions only (leave balance & notifications moved below) */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6">
          <QuickActions
            onRequestLeave={handleRequestLeave}
            onViewCalendar={handleViewCalendar}
            onEmergency={handleEmergency}
          />
        </div>
      </div>

      {/* Spotlight area under charts: empty visual area + right column for Balance & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 lg:gap-6 my-6">
        {/* Full-width area: notifications (left) horizontal + leave balance (right) - no extra gap */}
        <div className={`${leaveStyles.card.base} p-0`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="p-4">
              <LeaveBalanceCard balances={leaveBalances} />
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-orange-100/20 p-4">
              <LeaveNotifications
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onDelete={handleDeleteNotification}
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis - Important for Decision Making */}
      <TrendAnalysis data={trendData} />

      {/* Leave Calendar & Notifications - Mid Section */}
      <div className={leaveStyles.grid.main} data-calendar>
        {/* Leave Calendar */}
        <div className="lg:col-span-2">
          <LeaveCalendar leaveDays={leaveDays} />
        </div>
      </div>

      {/* Leave History - At Bottom */}
      <LeaveHistory
        requests={leaveRequests}
        onEdit={handleEditRequest}
        onCancel={handleCancelRequest}
      />

      {/* Leave Request Form Modal */}
      <LeaveRequestForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
