"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
}: ItemFormProps) {
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

  const handleFormSubmit = async (data: FormData) => {
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
      photos: defaultValues?.photos ?? [],
    });
  };

  const category = watch("category");
  const condition = watch("condition");

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" placeholder="e.g. MacBook Pro 16-inch" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

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
          <Input id="serialNumber" placeholder="Optional" {...register("serialNumber")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Storage Location</Label>
          <Input id="location" placeholder="e.g. Home office, Garage" {...register("location")} />
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
