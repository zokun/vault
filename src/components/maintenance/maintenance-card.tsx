"use client";

import { CheckCircle2, Circle, Wrench, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MaintenanceRecord } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate as fmtDate } from "@/lib/utils/date";

interface MaintenanceCardProps {
  record: MaintenanceRecord;
  onMarkComplete?: (id: number) => void;
}

export function MaintenanceCard({ record, onMarkComplete }: MaintenanceCardProps) {
  const isComplete = !!record.completedDate;

  return (
    <Card className={isComplete ? "opacity-70" : ""}>
      <CardContent className="p-4 flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900">{record.title}</p>
            <Badge variant={record.type === "diy" ? "secondary" : "outline"}>
              {record.type === "diy" ? (
                <><Wrench className="h-3 w-3 mr-1" />DIY</>
              ) : (
                <><User className="h-3 w-3 mr-1" />Professional</>
              )}
            </Badge>
          </div>

          {record.description && (
            <p className="text-sm text-slate-500 line-clamp-2">{record.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            {record.scheduledDate && (
              <span>Scheduled: {fmtDate(record.scheduledDate)}</span>
            )}
            {record.completedDate && (
              <span>Completed: {fmtDate(record.completedDate)}</span>
            )}
            {record.cost != null && (
              <span>Cost: {formatCurrency(record.cost)}</span>
            )}
          </div>
        </div>

        {!isComplete && onMarkComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkComplete(record.id)}
            className="shrink-0"
          >
            Mark done
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
