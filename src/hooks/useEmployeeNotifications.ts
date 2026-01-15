"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type EmployeeNotification = {
  id: string;
  type: "leave" | "remote_work" | "attendance_correction";
  state: "pending" | "approved" | "rejected";
  title: string;
  message: string;
  createdAt: string;
};

const STORAGE_KEY = "nexora-employee-notif-read";

const loadStored = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
};

const persist = (keys: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
  } catch {
    // ignore storage failures
  }
};

const makeReadKey = (notification: EmployeeNotification) =>
  `${notification.type}-${notification.id}-${notification.state}`;

export function useEmployeeNotifications(autoRefreshMs = 30000) {
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/employee");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadKeys(loadStored());
    fetchNotifications();
    if (autoRefreshMs > 0) {
      const id = window.setInterval(fetchNotifications, autoRefreshMs);
      return () => window.clearInterval(id);
    }
    return undefined;
  }, [autoRefreshMs, fetchNotifications]);

  const unreadCount = useMemo(
    () =>
      notifications.reduce((count, n) => {
        if (n.state === "pending") return count;
        return readKeys.has(makeReadKey(n)) ? count : count + 1;
      }, 0),
    [notifications, readKeys]
  );

  const markAsRead = useCallback(
    (notification: EmployeeNotification) => {
      const key = makeReadKey(notification);
      if (readKeys.has(key)) return;
      const next = new Set(readKeys);
      next.add(key);
      setReadKeys(next);
      persist(next);
    },
    [readKeys]
  );

  const markAllAsRead = useCallback(() => {
    const next = new Set(readKeys);
    notifications
      .filter((n) => n.state !== "pending")
      .forEach((n) => next.add(makeReadKey(n)));
    setReadKeys(next);
    persist(next);
  }, [notifications, readKeys]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
