"use client";

import { Calendar, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RentalListing } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

interface RentalCardProps {
  listing: RentalListing;
  itemName?: string;
  onToggle?: (id: number, isActive: boolean) => void;
  onDelete?: (id: number) => void;
}

export function RentalCard({ listing, itemName, onToggle, onDelete }: RentalCardProps) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            {itemName && (
              <p className="font-medium text-slate-900">{itemName}</p>
            )}
            <div className="flex items-center gap-1 text-slate-700 mt-0.5">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700">
                {formatCurrency(listing.pricePerDay)}/day
              </span>
            </div>
          </div>
          <Badge variant={listing.isActive ? "success" : "secondary"}>
            {listing.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {listing.description && (
          <p className="text-sm text-slate-500 line-clamp-2">{listing.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>From {formatDate(listing.availableFrom)}</span>
          </div>
          {listing.availableTo && (
            <span>Until {formatDate(listing.availableTo)}</span>
          )}
        </div>

        {listing.contactInfo && (
          <p className="text-xs text-slate-500">Contact: {listing.contactInfo}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(listing.id, !listing.isActive)}
            >
              {listing.isActive ? (
                <><ToggleRight className="h-3.5 w-3.5 mr-1.5" />Deactivate</>
              ) : (
                <><ToggleLeft className="h-3.5 w-3.5 mr-1.5" />Activate</>
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(listing.id)}
            >
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
