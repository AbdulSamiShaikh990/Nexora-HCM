"use client";

import { leaveStyles } from "./styles";

interface TrendData {
  month: string;
  approved: number;
  pending: number;
  rejected: number;
}

interface TrendAnalysisProps {
  data: TrendData[];
}

export default function TrendAnalysis({ data }: TrendAnalysisProps) {
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.approved, d.pending, d.rejected])
  );

  const totalApproved = data.reduce((sum, d) => sum + d.approved, 0);
  const totalPending = data.reduce((sum, d) => sum + d.pending, 0);
  const totalRejected = data.reduce((sum, d) => sum + d.rejected, 0);
  const totalRequests = totalApproved + totalPending + totalRejected;

  const approvalRate = totalRequests > 0
    ? Math.round((totalApproved / totalRequests) * 100)
    : 0;

  return (
    <div className={leaveStyles.card.base}>
      <h3 className={leaveStyles.section.title}>📈 Leave Trends & Analytics</h3>
      <p className={leaveStyles.section.subtitle}>
        Your leave usage over the last 6 months
      </p>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 pb-6 border-b border-orange-100/30">
        <div className="bg-green-50/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalApproved}</p>
          <p className="text-xs text-green-700 mt-1">Approved</p>
        </div>
        <div className="bg-yellow-50/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
          <p className="text-xs text-yellow-700 mt-1">Pending</p>
        </div>
        <div className="bg-red-50/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{totalRejected}</p>
          <p className="text-xs text-red-700 mt-1">Rejected</p>
        </div>
      </div>

      {/* Approval Rate */}
      <div className="mb-6 pb-6 border-b border-orange-100/30">
          <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Approval Rate
          </span>
          <span className="text-lg font-bold text-orange-600">{approvalRate}%</span>
        </div>
        <div className="w-full bg-gray-200/50 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
            style={{ width: `${approvalRate}%` }}
          ></div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Monthly Breakdown</h4>

        <div className="overflow-x-auto">
          <div className="min-w-full space-y-3">
            {data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-gray-900 min-w-fit">
                    {item.month}
                  </span>
                  <span className="text-gray-600">
                    {item.approved + item.pending + item.rejected} requests
                  </span>
                </div>

                {/* Stacked Bar Chart */}
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden bg-gray-100/50 border border-gray-200/50">
                  {/* Approved */}
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-semibold transition-all hover:shadow-lg cursor-pointer group relative"
                    style={{
                      width: `${
                        maxValue > 0 ? (item.approved / maxValue) * 100 : 0
                      }%`,
                    }}
                    title={`Approved: ${item.approved}`}
                  >
                    {item.approved > 0 && (
                      <span className="text-xs font-bold">{item.approved}</span>
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap hidden group-hover:block z-10">
                      Approved: {item.approved}
                    </div>
                  </div>

                  {/* Pending */}
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-semibold transition-all hover:shadow-lg cursor-pointer group relative"
                    style={{
                      width: `${
                        maxValue > 0 ? (item.pending / maxValue) * 100 : 0
                      }%`,
                    }}
                    title={`Pending: ${item.pending}`}
                  >
                    {item.pending > 0 && (
                      <span className="text-xs font-bold">{item.pending}</span>
                    )}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap hidden group-hover:block z-10">
                      Pending: {item.pending}
                    </div>
                  </div>

                  {/* Rejected */}
                  {item.rejected > 0 && (
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center text-white text-xs font-semibold transition-all hover:shadow-lg cursor-pointer group relative"
                      style={{
                        width: `${
                          maxValue > 0 ? (item.rejected / maxValue) * 100 : 0
                        }%`,
                      }}
                      title={`Rejected: ${item.rejected}`}
                    >
                      {item.rejected > 0 && (
                        <span className="text-xs font-bold">{item.rejected}</span>
                      )}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap hidden group-hover:block z-10">
                        Rejected: {item.rejected}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-orange-100/30 bg-orange-50/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-orange-900 mb-2">Insights</h4>
        <ul className="text-xs text-orange-800 space-y-1">
          <li>
            ✓ You have{" "}
            <span className="font-semibold">{totalApproved} approved leaves</span>{" "}
            in the last 6 months
          </li>
          <li>
            ✓ Your approval rate is{" "}
            <span className="font-semibold">{approvalRate}%</span> of requests
          </li>
          {totalPending > 0 && (
            <li>
              ⏳ You have <span className="font-semibold">{totalPending} pending</span>{" "}
              requests awaiting approval
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
