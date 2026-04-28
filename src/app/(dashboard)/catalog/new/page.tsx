"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ItemForm } from "@/components/catalog/item-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import type { Item, ItemCategory, ItemCondition } from "@/types";

interface PhotoIdentification {
  name: string;
  category: ItemCategory;
  brand: string | null;
  model: string | null;
  description: string;
  condition: ItemCondition;
  typicalPriceMin: number | null;
  typicalPriceMax: number | null;
  /**
   * Per-item web reference image, set by the server when the source photo
   * contains 2+ items. Used as the primary thumbnail so each item is visually
   * distinct in the catalog. null for single-item photos.
   */
  webPhotoUrl: string | null;
}

export default function NewItemPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [detected, setDetected] = useState<PhotoIdentification[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handlePhotoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    setAnalyzing(true);
    setPhotoUrl(null);
    setDetected([]);
    setSelected(new Set());
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/identify-from-photo", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? `Server returned ${res.status}`);
      }
      const data = json?.data;
      setPhotoUrl(data.photoUrl);
      const items: PhotoIdentification[] = data.identifications ?? [];
      setDetected(items);
      setSelected(new Set(items.map((_, i) => i)));
      if (items.length === 0) {
        toast.message("Photo saved — couldn't identify any items, fill manually below.");
      } else if (items.length === 1) {
        toast.success(`Identified: ${items[0].name}`);
      } else {
        toast.success(`Found ${items.length} items in this photo`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not analyze photo";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoFile(file);
  };

  const reset = () => {
    setPhotoUrl(null);
    setDetected([]);
    setSelected(new Set());
  };

  const toggleSelected = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const removeDetected = (idx: number) => {
    setDetected((prev) => prev.filter((_, i) => i !== idx));
    setSelected((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      }
      return next;
    });
  };

  const saveEdit = (idx: number, data: Omit<Item, "id" | "createdAt" | "updatedAt">) => {
    setDetected((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              name: data.name,
              category: data.category,
              brand: data.brand,
              model: data.model,
              description: data.description ?? "",
              condition: data.condition,
            }
          : item
      )
    );
    setEditingIndex(null);
  };

  const createOne = async (data: Omit<Item, "id" | "createdAt" | "updatedAt">) => {
    setCreating(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create item");
      const { data: item } = await res.json();
      toast.success("Item added to your vault");
      router.push(`/catalog/${item.id}`);
    } catch {
      toast.error("Failed to add item");
    } finally {
      setCreating(false);
    }
  };

  const addSelectedToVault = async () => {
    const itemsToCreate = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => detected[i]);
    if (itemsToCreate.length === 0) return;

    setCreating(true);
    try {
      const results = await Promise.allSettled(
        itemsToCreate.map((it) => {
          // For multi-item scenes, prefer a web reference image as the primary
          // (so the catalog grid is scannable) and keep the source scene photo
          // as a secondary user photo. Falls through to source-only if web
          // lookup didn't return one.
          const photos = [
            ...(it.webPhotoUrl ? [it.webPhotoUrl] : []),
            ...(photoUrl ? [photoUrl] : []),
          ];
          return fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: it.name,
              description: it.description || null,
              category: it.category,
              condition: it.condition,
              purchaseDate: null,
              purchasePrice: null,
              brand: it.brand,
              model: it.model,
              serialNumber: null,
              location: null,
              notes: null,
              photos,
            }),
          }).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          });
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      if (failed === 0) {
        toast.success(`Added ${ok} item${ok === 1 ? "" : "s"} to your vault`);
      } else {
        toast.error(`Added ${ok}, ${failed} failed`);
      }
      router.push("/catalog");
    } finally {
      setCreating(false);
    }
  };

  const showDetectedList = !!photoUrl && detected.length > 0;
  const showManualFallback = !showDetectedList; // includes "no photo" and "photo+empty"
  const editingItem = editingIndex != null ? detected[editingIndex] : null;

  return (
    <div>
      <Header
        title="Add Item"
        description="Drop a photo to auto-identify, or fill in details manually"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/catalog">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="p-6 max-w-3xl space-y-6">
        {/* Drop zone — present unless we're showing the detected-items list */}
        {showManualFallback && (
          <>
            {photoUrl ? (
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-4">
                  <div className="relative h-28 w-28 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                    <Image
                      src={photoUrl}
                      alt="Uploaded item"
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {analyzing ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing photo with AI...
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Photo saved. Couldn&apos;t identify automatically — fill in below.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="shrink-0"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                )}
              >
                {analyzing ? (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Analyzing photo with AI...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Camera className="h-8 w-8" />
                    <p className="text-sm font-medium text-slate-700">
                      Drop a photo to auto-identify items
                    </p>
                    <p className="text-xs">
                      AI will detect each item in the photo and let you choose which to add
                    </p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            )}

            <ItemForm
              key={photoUrl ?? "empty"}
              defaultValues={photoUrl ? { photos: [photoUrl] } : undefined}
              initialPrimaryPhotoUrl={photoUrl}
              onSubmit={createOne}
              isLoading={creating}
              submitLabel="Add to Vault"
            />
          </>
        )}

        {/* Detected-items list */}
        {showDetectedList && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 flex items-start gap-4">
              <div className="relative h-28 w-28 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                <Image
                  src={photoUrl!}
                  alt="Source photo"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI detected {detected.length}{" "}
                  {detected.length === 1 ? "item" : "items"} in this photo
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Review the list below. Edit or remove anything that&apos;s wrong, then add the rest to your vault.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="shrink-0"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {detected.map((item, idx) => {
                const isSelected = selected.has(idx);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border p-3 flex items-center gap-3",
                      isSelected
                        ? "border-slate-300 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(idx)}
                      className="h-4 w-4 shrink-0 cursor-pointer"
                      aria-label={`Include ${item.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {item.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0">
                          {item.category}
                        </Badge>
                        {item.brand && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {item.brand}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIndex(idx)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDetected(idx)}
                      aria-label="Remove"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {selected.size} of {detected.length} selected
              </p>
              <Button
                onClick={addSelectedToVault}
                disabled={creating || selected.size === 0}
              >
                {creating
                  ? "Adding..."
                  : `Add ${selected.size} ${selected.size === 1 ? "item" : "items"} to vault`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Dialog
        open={editingIndex != null}
        onOpenChange={(o) => !o && setEditingIndex(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit detected item</DialogTitle>
          </DialogHeader>
          {editingItem && editingIndex != null && (
            <ItemForm
              key={editingIndex}
              defaultValues={{
                name: editingItem.name,
                category: editingItem.category,
                brand: editingItem.brand,
                model: editingItem.model,
                description: editingItem.description,
                condition: editingItem.condition,
                photos: [
                  ...(editingItem.webPhotoUrl ? [editingItem.webPhotoUrl] : []),
                  ...(photoUrl ? [photoUrl] : []),
                ],
              }}
              initialPrimaryPhotoUrl={editingItem.webPhotoUrl ?? photoUrl}
              enableEnrichment={false}
              onSubmit={async (data) => saveEdit(editingIndex, data)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
