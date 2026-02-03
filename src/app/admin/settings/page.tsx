"use client";
// cspell:ignore nexora Nexora

import { useEffect, useState } from "react";
import {
  Settings,
  Building2,
  Calendar,
  Clock,
  Bell,
  Save,
  X,
  Mail,
  User,
  Globe,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type SettingsTab =
  | "general"
  | "organization"
  | "notifications";

const defaultSettings = {
  // General
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  // Organization
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  defaultLeaveBalance: 15,
  probationPeriod: 3,
  // Notifications
  emailNotifications: true,
  leaveRequestAlerts: true,
  attendanceAlerts: true,
  payrollNotifications: true,
};

type SettingsState = typeof defaultSettings;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [adminInfo, setAdminInfo] = useState({
    name: "Admin User",
    email: "admin@nexora-hcm.com",
  });

  // Settings State
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/settings/admin");
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await res.json();
        if (data?.data?.admin) {
          setAdminInfo({
            name: data.data.admin.name || "Admin User",
            email: data.data.admin.email || "admin@nexora-hcm.com",
          });
        }
        if (data?.data?.settings) {
          const s = data.data.settings;
          setSettings({
            ...defaultSettings,
            timezone: s.timezone || defaultSettings.timezone,
            dateFormat: s.dateFormat || defaultSettings.dateFormat,
            workingDays: Array.isArray(s.workingDays)
              ? s.workingDays
              : defaultSettings.workingDays,
            workingHoursStart: s.workingHoursStart || defaultSettings.workingHoursStart,
            workingHoursEnd: s.workingHoursEnd || defaultSettings.workingHoursEnd,
            defaultLeaveBalance:
              typeof s.defaultLeaveBalance === "number"
                ? s.defaultLeaveBalance
                : defaultSettings.defaultLeaveBalance,
            probationPeriod:
              typeof s.probationPeriod === "number"
                ? s.probationPeriod
                : defaultSettings.probationPeriod,
            emailNotifications:
              s.notifications?.emailNotifications ?? defaultSettings.emailNotifications,
            leaveRequestAlerts:
              s.notifications?.leaveRequestAlerts ?? defaultSettings.leaveRequestAlerts,
            attendanceAlerts:
              s.notifications?.attendanceAlerts ?? defaultSettings.attendanceAlerts,
            payrollNotifications:
              s.notifications?.payrollNotifications ?? defaultSettings.payrollNotifications,
          });
        }
      } catch {
        setMessage({ type: "error", text: "Failed to load settings" });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,
          workingDays: settings.workingDays,
          workingHoursStart: settings.workingHoursStart,
          workingHoursEnd: settings.workingHoursEnd,
          defaultLeaveBalance: settings.defaultLeaveBalance,
          probationPeriod: settings.probationPeriod,
          notifications: {
            emailNotifications: settings.emailNotifications,
            leaveRequestAlerts: settings.leaveRequestAlerts,
            attendanceAlerts: settings.attendanceAlerts,
            payrollNotifications: settings.payrollNotifications,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      setMessage({ type: "success", text: "Settings saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setMessage({ type: "success", text: "Settings reset to defaults" });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleWorkingDay = (day: number) => {
    setSettings((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-blue-600/10 border border-white/20 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure system preferences and policies
            </p>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] ${
            message.type === "success"
              ? "bg-green-500/10 border-green-300/40"
              : "bg-red-500/10 border-red-300/40"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className={`font-medium text-sm ${
              message.type === "success" ? "text-green-700" : "text-red-700"
            }`}>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className={`ml-auto transition-colors ${
                message.type === "success" ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border border-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        {/* Tab Navigation */}
        <div className="relative flex overflow-x-auto border-b border-white/30 bg-gradient-to-r from-gray-50/40 to-gray-100/40 px-6">
          <TabButton
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            icon={<Settings className="w-4 h-4" />}
            label="General"
          />
          <TabButton
            active={activeTab === "organization"}
            onClick={() => setActiveTab("organization")}
            icon={<Building2 className="w-4 h-4" />}
            label="Organization"
          />
          <TabButton
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
            icon={<Bell className="w-4 h-4" />}
            label="Notifications"
          />
        </div>

        {/* Tab Content */}
        <div className="relative p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600 text-sm font-medium">Loading settings...</p>
              </div>
            </div>
          )}

          {/* General Settings */}
          {!loading && activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">
                General Settings
              </h2>

              {/* Admin Info - Read Only */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-200/40 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(147,51,234,0.1)]">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
                <div className="relative">
                  <h3 className="text-sm font-bold text-purple-900 mb-4 uppercase tracking-wider">
                    Administrator Information (Read-only)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ReadOnlyField
                      label="Admin Name"
                      value={adminInfo.name}
                      icon={<User className="w-4 h-4" />}
                    />
                    <ReadOnlyField
                      label="Admin Email"
                      value={adminInfo.email}
                      icon={<Mail className="w-4 h-4" />}
                    />
                    <ReadOnlyField
                      label="Company Name"
                      value="Nexora HCM"
                      icon={<Building2 className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>

              {/* Editable Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Timezone"
                  icon={<Globe className="w-4 h-4" />}
                  value={settings.timezone}
                  onChange={(v) => updateSetting("timezone", v)}
                  options={[
                    "UTC",
                    "Asia/Karachi",
                    "America/New_York",
                    "Europe/London",
                    "Asia/Dubai",
                  ]}
                />
                <SelectField
                  label="Date Format"
                  icon={<Calendar className="w-4 h-4" />}
                  value={settings.dateFormat}
                  onChange={(v) => updateSetting("dateFormat", v)}
                  options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]}
                />
              </div>
            </div>
          )}

          {/* Organization Settings */}
          {!loading && activeTab === "organization" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">
                Organization Settings
              </h2>

              {/* Working Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { day: 1, label: "Mon" },
                    { day: 2, label: "Tue" },
                    { day: 3, label: "Wed" },
                    { day: 4, label: "Thu" },
                    { day: 5, label: "Fri" },
                    { day: 6, label: "Sat" },
                    { day: 0, label: "Sun" },
                  ].map(({ day, label }) => (
                    <button
                      key={day}
                      onClick={() => toggleWorkingDay(day)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        settings.workingDays.includes(day)
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                          : "bg-white/60 text-gray-700 border border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Working Hours Start"
                  icon={<Clock className="w-4 h-4" />}
                  type="time"
                  value={settings.workingHoursStart}
                  onChange={(v) => updateSetting("workingHoursStart", v)}
                />
                <InputField
                  label="Working Hours End"
                  icon={<Clock className="w-4 h-4" />}
                  type="time"
                  value={settings.workingHoursEnd}
                  onChange={(v) => updateSetting("workingHoursEnd", v)}
                />
                <InputField
                  label="Default Leave Balance (Days)"
                  icon={<Calendar className="w-4 h-4" />}
                  type="number"
                  value={settings.defaultLeaveBalance.toString()}
                  onChange={(v) =>
                    updateSetting("defaultLeaveBalance", parseInt(v) || 0)
                  }
                />
                <InputField
                  label="Probation Period (Months)"
                  icon={<Calendar className="w-4 h-4" />}
                  type="number"
                  value={settings.probationPeriod.toString()}
                  onChange={(v) =>
                    updateSetting("probationPeriod", parseInt(v) || 0)
                  }
                />
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {!loading && activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">
                Notification Settings
              </h2>

              <div className="space-y-3">
                <ToggleField
                  label="Email Notifications"
                  description="Enable email notifications for all users"
                  checked={settings.emailNotifications}
                  onChange={(v) => updateSetting("emailNotifications", v)}
                />
                <ToggleField
                  label="Leave Request Alerts"
                  description="Get notified when employees submit leave requests"
                  checked={settings.leaveRequestAlerts}
                  onChange={(v) => updateSetting("leaveRequestAlerts", v)}
                />
                <ToggleField
                  label="Attendance Alerts"
                  description="Receive alerts for attendance anomalies"
                  checked={settings.attendanceAlerts}
                  onChange={(v) => updateSetting("attendanceAlerts", v)}
                />
                <ToggleField
                  label="Payroll Notifications"
                  description="Get notifications about payroll processing"
                  checked={settings.payrollNotifications}
                  onChange={(v) => updateSetting("payrollNotifications", v)}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="relative mt-8 flex justify-end gap-3 pt-6 border-t border-white/30">
            <button
              onClick={handleReset}
              disabled={saving || loading}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-300/40 text-gray-700 hover:bg-gray-500/30 hover:border-gray-400/60 font-semibold text-sm transition-all backdrop-blur-sm disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap text-sm ${
        active
          ? "border-purple-600 text-purple-600"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500">
          {icon}
        </div>
        <input
          type="text"
          value={value}
          readOnly
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-purple-200/60 text-gray-700 font-medium cursor-not-allowed"
        />
      </div>
    </div>
  );
}

function InputField({
  label,
  icon,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-medium hover:bg-white/80 transition-all"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-medium hover:bg-white/80 transition-all appearance-none cursor-pointer"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60 hover:bg-white/80 transition-all">
      <div className="flex-1">
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
          checked ? "bg-gradient-to-r from-purple-600 to-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
