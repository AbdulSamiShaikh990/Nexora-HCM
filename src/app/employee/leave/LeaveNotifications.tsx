"use client";

import { Bell, AlertCircle, CheckCircle, Clock, Trash2 } from "lucide-react";
import { leaveStyles } from "./styles";

export interface LeaveNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "pending" | "error";
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface LeaveNotificationsProps {
  notifications: LeaveNotification[];
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean; // when true, render a horizontal compact list
}

export default function LeaveNotifications({
  notifications,
  onMarkAsRead,
  onDelete,
  compact = false,
}: LeaveNotificationsProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        );
      case "warning":
        return (
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
        );
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />;
      case "error":
        return (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        );
      default:
        return <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-orange-50 border-orange-200";
      case "pending":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-orange-50 border-orange-200";
    }
  };

  return (
    <div className={leaveStyles.card.base}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-100/30">
        <div className="flex items-center gap-2">
          <Bell className="w-6 sm:w-7 h-6 sm:h-7 text-orange-600" />
          <div>
            <h3 className={leaveStyles.section.title}>🔔 Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-orange-600 font-bold mt-1">
                {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center w-7 h-7 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-lg">
            {unreadCount}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : compact ? (
        <div className="flex gap-3 overflow-x-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${leaveStyles.card.compact} min-w-[220px] max-w-[260px] flex-shrink-0`}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{notification.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{notification.timestamp}</span>
                    <div className="flex items-center gap-2">
                      {!notification.read && onMarkAsRead && (
                        <button onClick={() => onMarkAsRead(notification.id)} className="text-xs text-orange-600 font-medium">Mark</button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(notification.id)} className="p-1 rounded" title="Delete">
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                border rounded-lg p-4 transition-all
                ${
                  notification.read
                    ? "bg-white/30 border-orange-100/20"
                    : `${getNotificationBgColor(notification.type)} border-opacity-60`
                }
                ${!notification.read ? "shadow-md" : ""}
              `}
            >
              <div className="flex gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-700 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-xs text-gray-500">
                      {notification.timestamp}
                    </span>
                    <div className="flex gap-2">
                          {notification.action && (
                            <button
                              onClick={notification.action.onClick}
                              className={leaveStyles.button.tertiary}
                            >
                              {notification.action.label}
                            </button>
                          )}
                          {!notification.read && onMarkAsRead && (
                            <button
                              onClick={() => onMarkAsRead(notification.id)}
                              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Mark as read
                            </button>
                          )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(notification.id)}
                          className="p-1 hover:bg-gray-200/30 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
