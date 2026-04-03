"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Generates mock depreciation curve data for demonstration
function generateDepreciationData(
  purchasePrice: number,
  purchaseDate: string
) {
  const start = new Date(purchaseDate);
  const now = new Date();
  const data = [];
  const monthsDiff =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());

  for (let i = 0; i <= Math.min(monthsDiff, 24); i++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i);
    const yearsElapsed = i / 12;
    const value = purchasePrice * Math.pow(0.85, yearsElapsed);
    data.push({
      month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      value: Math.round(value),
    });
  }
  return data;
}

interface PortfolioChartProps {
  totalValue: number;
  totalPurchaseValue: number;
}

export function PortfolioChart({ totalValue, totalPurchaseValue }: PortfolioChartProps) {
  // Simple demo data showing portfolio value trend
  const data = generateDepreciationData(totalPurchaseValue,
    new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Portfolio Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(v)
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0f172a"
              strokeWidth={2}
              fill="url(#valueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
