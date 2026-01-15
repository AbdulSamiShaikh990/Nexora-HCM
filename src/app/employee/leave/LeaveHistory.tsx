"use client";

import { useState } from "react";
import { Eye, Edit, Trash2 } from "lucide-react";
import { leaveStyles } from "./styles";

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

interface LeaveHistoryProps {
  requests: LeaveRequest[];
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return leaveStyles.badge.approved;
    case "pending":
      return leaveStyles.badge.pending;
    case "rejected":
      return leaveStyles.badge.rejected;
    default:
      return leaveStyles.badge.active;
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function LeaveHistory({ requests, onEdit, onCancel }: LeaveHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("All");

  const leaveTypes = Array.from(new Set(requests.map((r) => r.leaveType)));

  const filteredRequests = requests.filter((r) => {
    const statusMatch =
      filterStatus === "All" ||
      r.status.toLowerCase() === filterStatus.toLowerCase();
    const typeMatch = filterType === "All" || r.leaveType === filterType;
    const searchMatch =
      r.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && typeMatch && searchMatch;
  });

  return (
    <div className={leaveStyles.card.base}>
      <h3 className={leaveStyles.section.title}>📋 Leave Requests</h3>
      <p className={leaveStyles.section.subtitle}>Your leave application history</p>

      {/* Search and Filters */}
      <div className="mb-6 pb-6 border-b border-orange-100/30 space-y-4">
        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search by leave type or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={leaveStyles.form.input}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Status:
            </label>
            <div className="flex gap-2">
              {["All", "Pending", "Approved", "Rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`${leaveStyles.filterButton.base} ${
                    filterStatus === status
                      ? leaveStyles.filterButton.active
                      : leaveStyles.filterButton.inactive
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Leave Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={leaveStyles.form.select}
            >
              <option value="All">All Types</option>
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 text-sm sm:text-base">No leave requests found</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className={leaveStyles.listItem.base}>
              {/* Header */}
              <div className={leaveStyles.listItem.header}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <h4 className={leaveStyles.listItem.title}>{request.leaveType}</h4>
                    <span className={`${leaveStyles.badge.base} ${getStatusBadge(request.status)} flex-shrink-0`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <p className={leaveStyles.listItem.subtitle}>{request.description}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className={leaveStyles.listItem.details}>
                <div className={leaveStyles.listItem.detailItem}>
                  <span className={leaveStyles.listItem.detailLabel}>Duration</span>
                  <span className={leaveStyles.listItem.detailValue}>{request.duration} days</span>
                </div>
                <div className={leaveStyles.listItem.detailItem}>
                  <span className={leaveStyles.listItem.detailLabel}>From</span>
                  <span className={leaveStyles.listItem.detailValue}>{request.startDate}</span>
                </div>
                <div className={leaveStyles.listItem.detailItem}>
                  <span className={leaveStyles.listItem.detailLabel}>To</span>
                  <span className={leaveStyles.listItem.detailValue}>{request.endDate}</span>
                </div>
                {request.approvalDate && (
                  <div className={leaveStyles.listItem.detailItem}>
                    <span className={leaveStyles.listItem.detailLabel}>Approved</span>
                    <span className={leaveStyles.listItem.detailValue}>{request.approvalDate}</span>
                  </div>
                )}
              </div>

              {/* Comments (if expanded) */}
              {expandedId === request.id && (
                <div className="mt-4 pt-4 border-t border-orange-100/30 space-y-3">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Applied on</p>
                    <p className="text-xs sm:text-sm text-gray-600">{request.appliedDate}</p>
                  </div>
                  {request.approvedBy && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Approved by</p>
                      <p className="text-xs sm:text-sm text-gray-600">{request.approvedBy}</p>
                    </div>
                  )}
                  {request.comments && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Comments</p>
                      <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {request.comments}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-orange-100/30">
                <button
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                  className={leaveStyles.button.tertiary}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {expandedId === request.id ? "Hide" : "View"}
                  </span>
                </button>
                {request.status === "pending" && onEdit && (
                  <button onClick={() => onEdit(request.id)} className={leaveStyles.button.tertiary}>
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                {request.status === "pending" && onCancel && (
                  <button
                    onClick={() => onCancel(request.id)}
                    className={`${leaveStyles.button.tertiary} text-red-600 hover:text-red-700`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
