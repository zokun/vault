import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-slate-100 p-2">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
