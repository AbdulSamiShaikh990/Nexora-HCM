"use client";

import { leaveStyles } from "./styles";

interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
  description: string;
}

interface LeaveBalanceProps {
  balances: LeaveBalance[];
}

export default function LeaveBalanceCard({ balances }: LeaveBalanceProps) {
  return (
    <div className={leaveStyles.card.base}>
      <h3 className={leaveStyles.section.title}>🏦 Leave Balance</h3>
      <p className={leaveStyles.section.subtitle}>Your current leave entitlements</p>

      <div className="space-y-4 sm:space-y-5">
        {balances.map((balance) => (
          <div key={balance.type} className="border-b border-orange-100/30 pb-4 sm:pb-5 last:border-b-0 last:pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3">
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">{balance.type}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{balance.description}</p>
              </div>
              <span className={`${leaveStyles.badge.base} ${leaveStyles.badge.active} whitespace-nowrap`}>
                {balance.remaining} remaining
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-3">
              <div>
                <span className="text-gray-600">Total:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{balance.total} days</p>
              </div>
              <div>
                <span className="text-gray-600">Used:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{balance.used} days</p>
              </div>
              <div>
                <span className="text-gray-600">Remaining:</span>
                <p className="font-semibold text-gray-900 mt-0.5">{balance.remaining} days</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={leaveStyles.progressBar.container}>
              <div
                className={leaveStyles.progressBar.fill}
                style={{ width: `${(balance.used / balance.total) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
