"use client";

import { useState } from "react";
import { leaveStyles } from "./styles";

interface LeaveChartData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface LeaveChartsProps {
  data: LeaveChartData[];
}

export default function LeaveCharts({ data }: LeaveChartsProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className={leaveStyles.card.base}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-orange-100/30">
        <div>
          <h3 className={leaveStyles.section.title}>📊 Leave Distribution</h3>
          <p className={leaveStyles.section.subtitle}>Visual breakdown of your leaves</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType("pie")}
            className={`${leaveStyles.filterButton.base} ${
              chartType === "pie"
                ? leaveStyles.filterButton.active
                : leaveStyles.filterButton.inactive
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`${leaveStyles.filterButton.base} ${
              chartType === "bar"
                ? leaveStyles.filterButton.active
                : leaveStyles.filterButton.inactive
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>

      {chartType === "pie" ? (
        // Pie Chart
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          <div className="w-48 h-48 sm:w-56 sm:h-56 relative flex-shrink-0">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-lg"
              style={{
                filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
              }}
            >
              {(() => {
                // Check if all counts are 0
                const totalCount = data.reduce((sum, item) => sum + item.count, 0);
                
                if (totalCount === 0) {
                  // Show empty state circle
                  return (
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="rgb(229, 231, 235)"
                      className="opacity-50"
                    />
                  );
                }

                // Filter out items with 0 count
                const activeData = data.filter(item => item.count > 0);
                
                // If only one item has data, draw a full circle
                if (activeData.length === 1) {
                  const colorMap: Record<string, string> = {
                    "Approved": "rgb(34, 197, 94)",
                    "Pending": "rgb(234, 179, 8)",
                    "Rejected": "rgb(239, 68, 68)",
                    "Active": "rgb(249, 115, 22)",
                  };
                  return (
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill={colorMap[activeData[0].type] || colorMap["Active"]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                }

                let cumulativeAngle = 0;
                return activeData.map((item, index) => {
                  const itemPercentage = (item.count / totalCount) * 100;
                  const sliceAngle = (itemPercentage / 100) * 360;
                  const startAngle = cumulativeAngle;
                  const endAngle = cumulativeAngle + sliceAngle;
                  cumulativeAngle = endAngle;

                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);

                  const largeArc = sliceAngle > 180 ? 1 : 0;
                  const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
                    "Z",
                  ].join(" ");

                  const colorMap: Record<string, string> = {
                    "Approved": "rgb(34, 197, 94)",
                    "Pending": "rgb(234, 179, 8)",
                    "Rejected": "rgb(239, 68, 68)",
                    "Active": "rgb(249, 115, 22)",
                  };

                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={colorMap[item.type] || colorMap["Active"]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );
                });
              })()}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3 w-full lg:w-auto">
            {data.map((item, index) => {
              const colorMap: Record<string, string> = {
                "Approved": "bg-green-500",
                "Pending": "bg-yellow-500",
                "Rejected": "bg-red-500",
                "Active": "bg-orange-500",
              };

              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 p-3 bg-white/50 rounded-lg border border-orange-100/30"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        colorMap[item.type] || colorMap["Active"]
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.type}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{item.count}</p>
                    <p className="text-xs text-gray-600">{item.percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Bar Chart
        <div className="space-y-4">
          {data.map((item, index) => {
            const colorMap: Record<string, string> = {
              "Approved": "from-green-400 to-green-600",
              "Pending": "from-yellow-400 to-yellow-600",
              "Rejected": "from-red-400 to-red-600",
              "Active": "from-orange-400 to-orange-600",
            };

            const barWidth = (item.count / maxCount) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {item.type}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.count} days ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${
                      colorMap[item.type] || colorMap["Active"]
                    } rounded-full transition-all duration-500`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
