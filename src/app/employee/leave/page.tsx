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
  const [leaveStats, setLeaveStats] = useState({
    totalApplied: 96,
    approved: 4,
    pending: 92,
    activeRequests: 2,
  });

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([
    {
      type: "Annual Leave",
      total: 21,
      used: 8,
      remaining: 13,
      description: "Yearly vacation leave",
    },
    {
      type: "Sick Leave",
      total: 15,
      used: 3,
      remaining: 12,
      description: "Medical leave for illness",
    },
    {
      type: "Personal Leave",
      total: 5,
      used: 1,
      remaining: 4,
      description: "Personal time off",
    },
    {
      type: "Maternity Leave",
      total: 90,
      used: 0,
      remaining: 90,
      description: "Maternity benefit leave",
    },
  ]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "1",
      leaveType: "Sick Leave",
      description: "Medical appointment and recovery",
      duration: 3,
      startDate: "1/10/2024",
      endDate: "1/12/2024",
      appliedDate: "1/8/2024",
      status: "approved",
      approvedBy: "Manager on 1/9/2024",
      approvalDate: "1/9/2024",
      comments: "Approved with medical certificate",
    },
    {
      id: "2",
      leaveType: "Annual Leave",
      description: "Personal vacation",
      duration: 2,
      startDate: "1/25/2024",
      endDate: "1/26/2024",
      appliedDate: "1/15/2024",
      status: "pending",
      comments: "Awaiting approval",
    },
    {
      id: "3",
      leaveType: "Personal Leave",
      description: "Family event",
      duration: 1,
      startDate: "2/5/2024",
      endDate: "2/5/2024",
      appliedDate: "1/20/2024",
      status: "approved",
      approvedBy: "Manager on 1/21/2024",
      approvalDate: "1/21/2024",
      comments: "Approved",
    },
  ]);

  const [notifications, setNotifications] = useState<LeaveNotification[]>([
    {
      id: "1",
      title: "Leave Approved",
      message: "Your sick leave from 1/10/2024 to 1/12/2024 has been approved",
      type: "success",
      timestamp: "2 hours ago",
      read: true,
    },
    {
      id: "2",
      title: "Leave Request Pending",
      message: "Your annual leave request from 1/25/2024 to 1/26/2024 is awaiting approval",
      type: "pending",
      timestamp: "5 hours ago",
      read: false,
      action: {
        label: "View Details",
        onClick: () => console.log("View details clicked"),
      },
    },
    {
      id: "3",
      title: "Low Leave Balance",
      message: "Your annual leave balance is running low. Only 13 days remaining",
      type: "warning",
      timestamp: "1 day ago",
      read: false,
    },
  ]);

  // Simulate API call to fetch data
  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        const response = await fetch("/api/leave");
        if (response.ok) {
          const data = await response.json();
          
          // Update leave requests from API
          if (data.data && Array.isArray(data.data)) {
            const requests = data.data.map((item: any) => ({
              id: String(item.id),
              leaveType: item.type,
              description: item.reason || "-",
              duration: item.days,
              startDate: new Date(item.startDate).toLocaleDateString(),
              endDate: new Date(item.endDate).toLocaleDateString(),
              appliedDate: new Date(item.createdAt || Date.now()).toLocaleDateString(),
              status: item.status?.toLowerCase() === "pending" ? "pending" : 
                      item.status?.toLowerCase() === "approved" ? "approved" : "rejected",
              approvedBy: item.approvedBy,
              approvalDate: item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : undefined,
              comments: item.reason,
            }));
            setLeaveRequests(requests);
          }

          // Update stats
          if (data.stats) {
            setLeaveStats({
              totalApplied: data.stats.totalThisMonth || 0,
              approved: data.data?.filter((r: any) => r.status === "Approved").length || 0,
              pending: data.data?.filter((r: any) => r.status === "Pending").length || 0,
              activeRequests: data.data?.filter((r: any) => r.status === "Pending").length || 0,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch leave data:", error);
      }
    };

    fetchLeaveData();
  }, []);

  const handleRequestLeave = () => {
    setIsFormOpen(true);
  };

  const handleViewCalendar = () => {
    // TODO: Implement calendar view
    alert("Calendar view - Coming soon!");
  };

  const handleCheckPolicy = () => {
    // TODO: Implement policy viewer
    alert("Leave policy - Coming soon!");
  };

  const handleEmergency = () => {
    setIsFormOpen(true);
    // TODO: Set form to emergency mode
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

  return (
    <div className={leaveStyles.container.base}>
      {/* Header with CTA */}
      <div className={leaveStyles.container.header}>
        <div>
          <h1 className={leaveStyles.container.title}>Leave Management</h1>
          <p className={leaveStyles.container.subtitle}>
            Manage your leave requests and track balance
          </p>
        </div>
        <button
          onClick={handleRequestLeave}
          className={`${leaveStyles.button.primary} flex-shrink-0`}
        >
          <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
          <span>Request Leave</span>
        </button>
      </div>

      {/* Key Metrics - Leave Stats at Top */}
      <LeaveStats stats={leaveStats} />

      {/* Charts and Insights Section - Prominent Display */}
      <div className={leaveStyles.grid.main}>
        {/* Leave Distribution Chart - Large Display */}
        <div className="lg:col-span-2">
          <LeaveCharts
            data={[
              { type: "Approved", count: 4, percentage: 4, color: "green" },
              { type: "Pending", count: 92, percentage: 96, color: "yellow" },
              { type: "Rejected", count: 0, percentage: 0, color: "red" },
            ]}
          />
        </div>

        {/* Top-right: Quick Actions only (leave balance & notifications moved below) */}
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6">
          <QuickActions
            onRequestLeave={handleRequestLeave}
            onViewCalendar={handleViewCalendar}
            onCheckPolicy={handleCheckPolicy}
            onEmergency={handleEmergency}
          />
        </div>
      </div>

      {/* Spotlight area under charts: empty visual area + right column for Balance & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 lg:gap-6 my-6">
        {/* Full-width area: notifications (left) horizontal + leave balance (right) - no extra gap */}
        <div className={`${leaveStyles.card.base} p-0` }>
          <div className="grid grid-cols-2 gap-0">
            <div className="p-4">
              <LeaveBalanceCard balances={leaveBalances} />
            </div>
            <div className="border-l border-orange-100/20 p-4">
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
      <TrendAnalysis
        data={[
          {
            month: "Aug 2023",
            approved: 5,
            pending: 2,
            rejected: 0,
          },
          {
            month: "Sep 2023",
            approved: 3,
            pending: 1,
            rejected: 0,
          },
          {
            month: "Oct 2023",
            approved: 4,
            pending: 3,
            rejected: 1,
          },
          {
            month: "Nov 2023",
            approved: 6,
            pending: 2,
            rejected: 0,
          },
          {
            month: "Dec 2023",
            approved: 2,
            pending: 1,
            rejected: 0,
          },
          {
            month: "Jan 2024",
            approved: 4,
            pending: 92,
            rejected: 0,
          },
        ]}
      />

      {/* Leave Calendar & Notifications - Mid Section */}
      <div className={leaveStyles.grid.main}>
        {/* Leave Calendar */}
        <div className="lg:col-span-2">
          <LeaveCalendar
            leaveDays={[
              {
                date: "2024-01-10",
                status: "approved",
                type: "Sick Leave",
              },
              {
                date: "2024-01-11",
                status: "approved",
                type: "Sick Leave",
              },
              {
                date: "2024-01-12",
                status: "approved",
                type: "Sick Leave",
              },
              {
                date: "2024-01-25",
                status: "pending",
                type: "Annual Leave",
              },
              {
                date: "2024-01-26",
                status: "pending",
                type: "Annual Leave",
              },
              {
                date: "2024-02-05",
                status: "approved",
                type: "Personal Leave",
              },
            ]}
          />
        </div>

        {/* right column intentionally left empty (notifications moved above) */}
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
