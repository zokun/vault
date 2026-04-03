"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "#0f172a", "#1e3a5f", "#334155", "#475569",
  "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0",
];

interface CategoryBreakdownProps {
  data: { category: string; count: number }[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Items by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-8">No items yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Items by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={40}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, name: string) => [v, name]} />
            <Legend
              formatter={(value) =>
                value.charAt(0).toUpperCase() + value.slice(1)
              }
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
