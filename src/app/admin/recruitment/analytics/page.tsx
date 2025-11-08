"use client";
import { useEffect, useState } from "react";

interface Analytics {
  total: number;
  byStage: Record<string, number>;
  interviews: number;
  offers: number;
  hires: number;
  offerToHireRatio: number;
  bottleneck: string | null;
}

interface NotificationItem { id: string; type: string; payload: any; createdAt: string }

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ar, nr] = await Promise.all([
        fetch("/api/recuirment/analytics"),
        fetch("/api/recuirment/notifications"),
      ]);
      const [a, n] = await Promise.all([ar.json(), nr.json()]);
      if (!ar.ok) throw new Error(a?.error || "Failed analytics");
      if (!nr.ok) throw new Error(n?.error || "Failed notifications");
      setData(a);
      setNotifs(n);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recruitment Analytics</h1>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-600">{error}</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="text-sm text-gray-700">Total Applications</div>
              <div className="text-2xl font-semibold text-gray-900">{data?.total ?? 0}</div>
            </div>
            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="text-sm text-gray-700">Interviews</div>
              <div className="text-2xl font-semibold text-gray-900">{data?.interviews ?? 0}</div>
            </div>
            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="text-sm text-gray-700">Hires</div>
              <div className="text-2xl font-semibold text-gray-900">{data?.hires ?? 0}</div>
            </div>
            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="text-sm text-gray-700">Offer → Hire %</div>
              <div className="text-2xl font-semibold text-gray-900">{data?.offerToHireRatio ?? 0}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="font-semibold text-gray-900">By Stage</div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(data?.byStage || {}).map(([k,v]) => (
                  <div key={k} className="rounded-lg border border-white/40 bg-white/80 p-3">
                    <div className="text-sm text-gray-700 capitalize">{k}</div>
                    <div className="text-lg font-semibold text-gray-900">{v as number}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-700">Bottleneck: <span className="font-medium text-gray-900">{data?.bottleneck ?? '—'}</span></div>
            </div>

            <div className="rounded-xl border border-white/30 bg-white/60 backdrop-blur p-4">
              <div className="font-semibold text-gray-900">Notifications</div>
              <div className="mt-2 space-y-2 max-h-80 overflow-auto pr-1">
                {notifs.length === 0 ? <div className="text-sm text-gray-600">No notifications yet.</div> : notifs.map(n => (
                  <div key={n.id} className="rounded-lg border border-white/40 bg-white/80 p-2">
                    <div className="text-sm text-gray-900">{n.type}</div>
                    <div className="text-xs text-gray-700">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
