"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemCard } from "@/components/catalog/item-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item } from "@/types";

const CATEGORIES = [
  "all",
  "electronics",
  "furniture",
  "clothing",
  "appliances",
  "tools",
  "sports",
  "books",
  "vehicles",
  "jewelry",
  "art",
  "collectibles",
  "other",
];

async function fetchItems(category?: string, search?: string): Promise<Item[]> {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (search) params.set("search", search);
  const res = await fetch(`/api/items?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch items");
  const { data } = await res.json();
  return data;
}

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items", category, debouncedSearch],
    queryFn: () => fetchItems(category, debouncedSearch),
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Simple debounce
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div>
      <Header
        title="Catalog"
        description={`${items.length} item${items.length !== 1 ? "s" : ""}`}
        actions={
          <Button asChild size="sm">
            <Link href="/catalog/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Item
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p className="text-lg font-medium mb-2">No items found</p>
            <p className="text-sm mb-6">
              {search || category !== "all"
                ? "Try adjusting your filters"
                : "Add your first item to get started"}
            </p>
            {!search && category === "all" && (
              <Button asChild>
                <Link href="/catalog/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Item
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
