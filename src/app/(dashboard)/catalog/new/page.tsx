"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ItemForm } from "@/components/catalog/item-form";
import { Button } from "@/components/ui/button";
import type { Item } from "@/types";

export default function NewItemPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    data: Omit<Item, "id" | "createdAt" | "updatedAt" | "photos">
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, photos: [] }),
      });

      if (!res.ok) throw new Error("Failed to create item");

      const { data: item } = await res.json();
      toast.success("Item added to your vault");
      router.push(`/catalog/${item.id}`);
    } catch {
      toast.error("Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Add Item"
        description="Add a new item to your vault"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/catalog">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="p-6 max-w-2xl">
        <ItemForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Add to Vault"
        />
      </div>
    </div>
  );
}
