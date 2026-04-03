"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnrichmentBanner, type EnrichmentSuggestion } from "./enrichment-banner";
import { ImagePicker, type ImageResult } from "./image-picker";
import type { Item, ItemCategory, ItemCondition } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().default("other"),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).default("good"),
  purchaseDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ItemFormProps {
  defaultValues?: Partial<Item>;
  onSubmit: (data: Omit<Item, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  /** Enable AI enrichment (debounced lookup as user types). Default: true for new items. */
  enableEnrichment?: boolean;
}

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "appliances", label: "Appliances" },
  { value: "tools", label: "Tools" },
  { value: "sports", label: "Sports" },
  { value: "books", label: "Books" },
  { value: "vehicles", label: "Vehicles" },
  { value: "jewelry", label: "Jewelry" },
  { value: "art", label: "Art" },
  { value: "collectibles", label: "Collectibles" },
  { value: "other", label: "Other" },
];

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

export function ItemForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Save Item",
  enableEnrichment,
}: ItemFormProps) {
  // Enrichment is enabled by default only for new items (no existing id)
  const enrichmentEnabled = enableEnrichment ?? !defaultValues?.name;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      category: defaultValues?.category ?? "other",
      condition: defaultValues?.condition ?? "good",
      purchaseDate: defaultValues?.purchaseDate ?? "",
      purchasePrice: defaultValues?.purchasePrice?.toString() ?? "",
      brand: defaultValues?.brand ?? "",
      model: defaultValues?.model ?? "",
      serialNumber: defaultValues?.serialNumber ?? "",
      location: defaultValues?.location ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  // Enrichment state
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<EnrichmentSuggestion | null>(null);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [enrichDismissed, setEnrichDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueriedName = useRef<string>("");

  const name = watch("name");
  const category = watch("category");
  const condition = watch("condition");

  // Debounced enrichment lookup triggered by name field
  useEffect(() => {
    if (!enrichmentEnabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed === lastQueriedName.current) return;

    debounceRef.current = setTimeout(async () => {
      lastQueriedName.current = trimmed;
      setEnrichLoading(true);
      setEnrichDismissed(false);
      try {
        const res = await fetch(
          `/api/enrich/lookup?name=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) return;
        const { data } = await res.json();
        if (data.metadata) setSuggestion(data.metadata);
        if (data.images?.length) setImages(data.images);
      } catch {
        // Silently fail — enrichment is always optional
      } finally {
        setEnrichLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, enrichmentEnabled]);

  const handleApplySuggestion = (s: EnrichmentSuggestion) => {
    setValue("category", s.category);
    if (s.brand) setValue("brand", s.brand);
    if (s.model) setValue("model", s.model);
    if (s.description && !watch("description")) setValue("description", s.description);
    if (s.typicalPriceMin && !watch("purchasePrice")) {
      setValue("purchasePrice", String(s.typicalPriceMin));
    }
    setEnrichDismissed(true);
  };

  const handleFormSubmit = async (data: FormData) => {
    const basePhotos = defaultValues?.photos ?? [];
    const photos = selectedImageUrl
      ? [selectedImageUrl, ...basePhotos]
      : basePhotos;

    await onSubmit({
      name: data.name,
      description: data.description ?? null,
      category: data.category as ItemCategory,
      condition: data.condition as ItemCondition,
      purchaseDate: data.purchaseDate ?? null,
      purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : null,
      brand: data.brand ?? null,
      model: data.model ?? null,
      serialNumber: data.serialNumber ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
      photos,
    });
  };

  const showBanner =
    enrichmentEnabled && !enrichDismissed && suggestion !== null;
  const showImages =
    enrichmentEnabled && images.length > 0 && !enrichDismissed;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="e.g. MacBook Pro 16-inch"
              {...register("name")}
            />
            {enrichLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
            )}
          </div>
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* AI Enrichment Banner — appears below name field */}
        {showBanner && (
          <div className="sm:col-span-2">
            <EnrichmentBanner
              suggestion={suggestion!}
              onApply={handleApplySuggestion}
              onDismiss={() => setEnrichDismissed(true)}
            />
          </div>
        )}

        {/* Image Picker — appears after banner */}
        {showImages && (
          <div className="sm:col-span-2">
            <ImagePicker
              images={images}
              selectedUrl={selectedImageUrl}
              onSelect={setSelectedImageUrl}
              isLoading={enrichLoading && images.length === 0}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" placeholder="e.g. Apple" {...register("brand")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="model">Model</Label>
          <Input id="model" placeholder="e.g. MBP-2024" {...register("model")} />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(val) => setValue("category", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select
            value={condition}
            onValueChange={(val) => setValue("condition", val as ItemCondition)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Purchase Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
          <Input
            id="purchasePrice"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("purchasePrice")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            id="serialNumber"
            placeholder="Optional"
            {...register("serialNumber")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Storage Location</Label>
          <Input
            id="location"
            placeholder="e.g. Home office, Garage"
            {...register("location")}
          />
        </div>
      </div>

      {/* Description & Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the item..."
          rows={3}
          {...register("description")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          rows={2}
          {...register("notes")}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
