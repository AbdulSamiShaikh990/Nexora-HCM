"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { leaveStyles } from "./styles";

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaveFormData) => void;
}

export interface LeaveFormData {
  leaveType: string;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  attachments: File[];
}

interface LeaveBalance {
  type: string;
  remaining: number;
}

const leaveTypes = [
  { value: "annual", label: "Annual Leave (14/year)" },
  { value: "sick", label: "Sick Leave (3/month)" },
  { value: "casual", label: "Casual Leave (2/month)" },
  { value: "emergency", label: "Emergency Leave (1/month)" },
];

export default function LeaveRequestForm({ isOpen, onClose, onSubmit }: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: "",
    startDate: "",
    endDate: "",
    duration: 0,
    reason: "",
    attachments: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState("");

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch leave balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await fetch("/api/leave/employee");
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            // Calculate balances based on leave data
            const requests = data.data || [];
            const currentMonth = new Date().getMonth() + 1;
            
            const usedAnnual = requests.filter((r: any) => 
              r.type?.toLowerCase().includes('annual') && r.status === 'Approved'
            ).reduce((sum: number, r: any) => sum + (r.days || 0), 0);
            
            const usedSick = requests.filter((r: any) => 
              r.type?.toLowerCase().includes('sick') && r.status === 'Approved'
            ).reduce((sum: number, r: any) => sum + (r.days || 0), 0);
            
            const usedCasual = requests.filter((r: any) => 
              r.type?.toLowerCase().includes('casual') && r.status === 'Approved'
            ).reduce((sum: number, r: any) => sum + (r.days || 0), 0);
            
            const usedEmergency = requests.filter((r: any) => 
              r.type?.toLowerCase().includes('emergency') && r.status === 'Approved'
            ).reduce((sum: number, r: any) => sum + (r.days || 0), 0);

            setLeaveBalances([
              { type: "annual", remaining: Math.max(14 - usedAnnual, 0) },
              { type: "sick", remaining: Math.max((3 * currentMonth) - usedSick, 0) },
              { type: "casual", remaining: Math.max((2 * currentMonth) - usedCasual, 0) },
              { type: "emergency", remaining: Math.max((1 * currentMonth) - usedEmergency, 0) },
            ]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    };

    if (isOpen) {
      fetchBalances();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const newData = { ...formData, [field]: value };
    const duration = calculateDuration(newData.startDate, newData.endDate);
    setFormData({ ...newData, duration });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({ ...formData, attachments: files });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.leaveType) newErrors.leaveType = "Leave type is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (formData.startDate > formData.endDate) {
      newErrors.endDate = "End date must be after start date";
    }
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    if (formData.reason.trim().length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Check balance before submitting
      const selectedBalance = leaveBalances.find(b => b.type === formData.leaveType);
      if (selectedBalance && formData.duration > selectedBalance.remaining) {
        setBalanceWarning(
          `You are requesting ${formData.duration} day(s) but only have ${selectedBalance.remaining} day(s) remaining for this leave type. Do you still want to submit this request?`
        );
        setShowConfirmDialog(true);
      } else {
        submitLeaveRequest();
      }
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    setBalanceWarning("");
    submitLeaveRequest();
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setBalanceWarning("");
  };

  const submitLeaveRequest = async () => {
    try {
      const response = await fetch("/api/leave/submit", {
        method: "POST",
        body: JSON.stringify({
          type: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
          attachments: formData.attachments.map((f) => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors({ submit: error.error || "Failed to submit leave request" });
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Reset form
        setFormData({
          leaveType: "",
          startDate: "",
          endDate: "",
          duration: 0,
          reason: "",
          attachments: [],
        });
        setErrors({});
        onClose();
        
        // Trigger page refresh to update stats
        window.location.reload();
      }
    } catch (error) {
      console.error("Error submitting leave:", error);
      setErrors({ submit: "Error submitting request. Please try again." });
    }
  };

  if (!isOpen || !mounted) return null;

  // Confirmation Dialog
  const confirmDialog = showConfirmDialog && (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={handleCancelConfirm}></div>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-[10002] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Insufficient Balance</h3>
        </div>
        <p className="text-sm text-gray-700 mb-6">{balanceWarning}</p>
        <div className="flex gap-3">
          <button
            onClick={handleCancelConfirm}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSubmit}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Yes, Submit Anyway
          </button>
        </div>
      </div>
    </div>
  );

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Confirm Dialog */}
      {confirmDialog}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000] border border-orange-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-orange-100/50 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Request New Leave</h2>
            <p className="text-sm text-gray-600 mt-1">Fill in the details for your leave request</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-red-700 font-semibold">{errors.submit}</p>
            </div>
          )}
          {/* Leave Type */}
          <div className={leaveStyles.form.group}>
            <label className="text-sm sm:text-base font-bold text-gray-900">Leave Type *</label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm"
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.leaveType && <p className="text-red-600 text-xs mt-1">{errors.leaveType}</p>}
            {formData.leaveType && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Remaining Balance: </span>
                  {leaveBalances.find(b => b.type === formData.leaveType)?.remaining ?? 0} day(s)
                </p>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={leaveStyles.form.group}>
              <label className="text-sm sm:text-base font-bold text-gray-900">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm"
              />
              {errors.startDate && <p className="text-red-600 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div className={leaveStyles.form.group}>
              <label className="text-sm sm:text-base font-bold text-gray-900">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm"
              />
              {errors.endDate && <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Duration Display */}
          {formData.duration > 0 && (
            <div className="bg-orange-50/60 border border-orange-200/50 rounded-lg p-3 sm:p-4">
              <p className="text-sm text-orange-700">
                <span className="font-semibold">{formData.duration} day(s)</span> selected
              </p>
            </div>
          )}

          {/* Reason */}
          <div className={leaveStyles.form.group}>
            <label className="text-sm sm:text-base font-bold text-gray-900">Reason for Leave *</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide a detailed reason for your leave request..."
              rows={4}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm resize-none shadow-sm placeholder-gray-500"
            />
            <p className="text-xs text-gray-700 mt-1">
              {formData.reason.length}/500 characters
            </p>
            {errors.reason && <p className="text-red-600 text-xs mt-1">{errors.reason}</p>}
          </div>

          {/* Attachments */}
          <div className={leaveStyles.form.group}>
            <label className="text-sm sm:text-base font-bold text-gray-900">Supporting Documents (Optional)</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 border border-orange-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all text-sm shadow-sm"
            />
            <p className="text-xs text-gray-700 mt-1">
              Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
            </p>
            {formData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded">
                    <span>📎</span>
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-orange-100/30">
            <button
              type="button"
              onClick={onClose}
              className={leaveStyles.button.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={leaveStyles.button.primary}
            >
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
