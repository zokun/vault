import { ArrowRight, TrendingDown, Tag, Wrench } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recommendation } from "@/types";

const typeConfig = {
  sell: { icon: TrendingDown, label: "Consider Selling", color: "warning" as const },
  rent: { icon: Tag, label: "List for Rent", color: "default" as const },
  service: { icon: Wrench, label: "Needs Service", color: "secondary" as const },
  insure: { icon: ArrowRight, label: "Consider Insuring", color: "outline" as const },
};

const priorityColors = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            No recommendations right now. Keep adding items!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => {
          const config = typeConfig[rec.type];
          const Icon = config.icon;
          return (
            <Link
              key={rec.itemId}
              href={`/catalog/${rec.itemId}`}
              className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="rounded-md bg-slate-100 p-2 shrink-0">
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {rec.itemName}
                  </p>
                  <Badge variant={config.color} className="text-[10px] py-0">
                    {config.label}
                  </Badge>
                  <Badge variant={priorityColors[rec.priority]} className="text-[10px] py-0">
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{rec.reason}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
