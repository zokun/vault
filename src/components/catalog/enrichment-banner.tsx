"use client";

import { Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { ItemCategory, ItemCondition } from "@/types";

export interface EnrichmentSuggestion {
  category: ItemCategory;
  brand: string | null;
  model: string | null;
  description: string;
  condition: ItemCondition;
  typicalPriceMin: number | null;
  typicalPriceMax: number | null;
  rentalSuitability: "high" | "medium" | "low";
}

interface EnrichmentBannerProps {
  suggestion: EnrichmentSuggestion;
  onApply: (suggestion: EnrichmentSuggestion) => void;
  onDismiss: () => void;
}

const rentalColors = {
  high: "success",
  medium: "secondary",
  low: "outline",
} as const;

export function EnrichmentBanner({ suggestion, onApply, onDismiss }: EnrichmentBannerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700">AI Suggestions</span>
          <Badge variant="secondary" className="text-[10px] py-0">
            {suggestion.category}
          </Badge>
          {suggestion.brand && (
            <Badge variant="outline" className="text-[10px] py-0">
              {suggestion.brand}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-slate-200">
          {suggestion.description && (
            <p className="text-xs text-slate-600">{suggestion.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {suggestion.typicalPriceMin && suggestion.typicalPriceMax && (
              <span>
                Typical price: <strong>${suggestion.typicalPriceMin}–${suggestion.typicalPriceMax}</strong>
              </span>
            )}
            <span className="flex items-center gap-1">
              Rental fit:
              <Badge variant={rentalColors[suggestion.rentalSuitability]} className="text-[10px] py-0 ml-1">
                {suggestion.rentalSuitability}
              </Badge>
            </span>
          </div>
        </div>
      )}

      {/* Apply button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full text-xs h-7"
        onClick={() => onApply(suggestion)}
      >
        <Sparkles className="h-3 w-3 mr-1.5" />
        Apply suggestions to form
      </Button>
    </div>
  );
}
