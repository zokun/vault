"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Item } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

const conditionColors: Record<string, "success" | "default" | "secondary" | "warning" | "destructive"> = {
  new: "success",
  like_new: "success",
  good: "default",
  fair: "warning",
  poor: "destructive",
};

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const photo = item.photos[0];

  return (
    <Link href={`/catalog/${item.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer h-full">
        {/* Photo */}
        <div className="relative h-40 bg-slate-100">
          {photo ? (
            <Image
              src={photo}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-12 w-12 text-slate-300" />
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Name + condition */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900 line-clamp-1">{item.name}</p>
              {(item.brand || item.model) && (
                <p className="text-xs text-slate-500 line-clamp-1">
                  {[item.brand, item.model].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
            <Badge variant={conditionColors[item.condition] ?? "secondary"} className="shrink-0">
              {conditionLabels[item.condition] ?? item.condition}
            </Badge>
          </div>

          {/* Category */}
          <Badge variant="outline" className="capitalize">
            {item.category}
          </Badge>

          {/* Stats */}
          <div className="space-y-1 text-xs text-slate-500">
            {item.purchasePrice != null && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>Paid {formatCurrency(item.purchasePrice)}</span>
              </div>
            )}
            {item.purchaseDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(item.purchaseDate)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
