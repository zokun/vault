"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { MarketValueSummary } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/date";
import { toast } from "sonner";

interface PriceDisplayProps {
  itemId: number;
  initialData?: MarketValueSummary | null;
}

export function PriceDisplay({ itemId, initialData }: PriceDisplayProps) {
  const [data, setData] = useState<MarketValueSummary | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const autoFetched = useRef(false);

  const refresh = async (silent = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-value/${itemId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to fetch prices");
      const { data: summary } = await res.json();
      setData(summary);
      if (!silent) toast.success("Market prices updated");
    } catch {
      if (!silent) toast.error("Could not fetch market prices");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if no cached data, so the user never has to click a button.
  useEffect(() => {
    if (autoFetched.current) return;
    if (data) return;
    autoFetched.current = true;
    refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Market Value
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Fetching..." : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!data ? (
          <div className="text-center py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Fetching market prices...
              </div>
            ) : (
              <p className="text-sm text-slate-500">No market data available</p>
            )}
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Low</p>
                <p className="font-semibold text-slate-700">{formatCurrency(data.lowPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg</p>
                <p className="font-bold text-slate-900 text-lg">{formatCurrency(data.averagePrice)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">High</p>
                <p className="font-semibold text-slate-700">{formatCurrency(data.highPrice)}</p>
              </div>
            </div>

            {/* Per-source breakdown */}
            <div className="space-y-2">
              {data.results.map((result) => (
                <div key={result.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{result.source}</span>
                      {result.error ? (
                        <Badge variant="secondary" className="text-[10px]">unavailable</Badge>
                      ) : (
                        <span className="text-slate-500">{formatCurrency(result.price)}</span>
                      )}
                    </div>
                    {result.url && !result.error && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {!result.error && (
                    <Progress value={result.confidence * 100} className="h-1" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              Updated {formatRelative(data.fetchedAt)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
