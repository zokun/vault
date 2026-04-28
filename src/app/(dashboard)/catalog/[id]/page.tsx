"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Wrench,
  Tag,
  DollarSign,
  Calendar,
  MapPin,
  Hash,
  Package,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PriceDisplay } from "@/components/market-value/price-display";
import { PhotoUpload } from "@/components/catalog/photo-upload";
import { ItemForm } from "@/components/catalog/item-form";
import { MaintenanceCard } from "@/components/maintenance/maintenance-card";
import { RentalCard } from "@/components/rentals/rental-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Item, MaintenanceRecord, RentalListing, MarketValueSummary } from "@/types";
import { formatCurrency, calcDepreciation } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

// User-uploaded photos live under /uploads/ (written by /api/items/:id/photos).
// Anything else (typically https://...) was supplied by the app via image search.
function isUserPhoto(url: string): boolean {
  return url.startsWith("/uploads/");
}

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const conditionColors: Record<string, "success" | "default" | "secondary" | "warning" | "destructive"> = {
  new: "success",
  like_new: "success",
  good: "default",
  fair: "warning",
  poor: "destructive",
};

async function fetchItem(id: string): Promise<Item> {
  const res = await fetch(`/api/items/${id}`);
  if (!res.ok) throw new Error("Item not found");
  const { data } = await res.json();
  return data;
}

async function fetchMaintenanceRecords(itemId: string): Promise<MaintenanceRecord[]> {
  const res = await fetch(`/api/maintenance?itemId=${itemId}`);
  const { data } = await res.json();
  return data ?? [];
}

async function fetchRentals(itemId: string): Promise<RentalListing[]> {
  const res = await fetch(`/api/rentals?itemId=${itemId}`);
  const { data } = await res.json();
  return data ?? [];
}

async function fetchMarketValue(itemId: string): Promise<MarketValueSummary | null> {
  const res = await fetch(`/api/market-value/${itemId}`);
  const { data } = await res.json();
  return data;
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [editOpen, setEditOpen] = useState(false);
  const [photoOverride, setPhotoOverride] = useState<string[] | null>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: () => fetchItem(id),
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["maintenance", id],
    queryFn: () => fetchMaintenanceRecords(id),
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["rentals", id],
    queryFn: () => fetchRentals(id),
  });

  const { data: marketValue } = useQuery({
    queryKey: ["market-value", id],
    queryFn: () => fetchMarketValue(id),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      router.push("/catalog");
    },
    onError: () => toast.error("Failed to delete item"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Item>) => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Item updated");
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update item"),
  });

  const markMaintenanceDone = async (maintenanceId: number) => {
    await fetch(`/api/maintenance/${maintenanceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedDate: new Date().toISOString().split("T")[0] }),
    });
    queryClient.invalidateQueries({ queryKey: ["maintenance", id] });
    toast.success("Marked as complete");
  };

  const toggleRental = async (rentalId: number, isActive: boolean) => {
    await fetch(`/api/rentals/${rentalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["rentals", id] });
  };

  const deleteRental = async (rentalId: number) => {
    await fetch(`/api/rentals/${rentalId}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["rentals", id] });
    toast.success("Rental removed");
  };

  if (isLoading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="p-6 space-y-4">
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <Header title="Item Not Found" />
        <div className="p-6">
          <p className="text-slate-500">This item doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link href="/catalog">Back to Catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentPhotos = photoOverride ?? item.photos;
  const userPhotos = currentPhotos.filter(isUserPhoto);
  const webPhotos = currentPhotos.filter((p) => !isUserPhoto(p));
  const depreciation =
    item.purchasePrice && item.purchaseDate
      ? calcDepreciation(item.purchasePrice, item.purchaseDate)
      : null;

  return (
    <div>
      <Header
        title={item.name}
        description={[item.brand, item.model].filter(Boolean).join(" ") || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Item</DialogTitle>
                </DialogHeader>
                <ItemForm
                  defaultValues={item}
                  onSubmit={async (data) => { await updateMutation.mutateAsync(data); }}
                  isLoading={updateMutation.isPending}
                  submitLabel="Save Changes"
                  enableEnrichment={true}
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this item and all its associated data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/catalog">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="maintenance">
                  Maintenance {maintenance.length > 0 && `(${maintenance.length})`}
                </TabsTrigger>
                <TabsTrigger value="rentals">
                  Rentals {rentals.length > 0 && `(${rentals.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Details tab */}
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="capitalize">{item.category}</Badge>
                      <Badge variant={conditionColors[item.condition] ?? "secondary"}>
                        {conditionLabels[item.condition] ?? item.condition}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-slate-600">{item.description}</p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.purchasePrice != null && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs">Purchase Price</p>
                            <p className="font-medium">{formatCurrency(item.purchasePrice)}</p>
                          </div>
                        </div>
                      )}
                      {item.purchaseDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs">Purchase Date</p>
                            <p className="font-medium">{formatDate(item.purchaseDate)}</p>
                          </div>
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs">Location</p>
                            <p className="font-medium">{item.location}</p>
                          </div>
                        </div>
                      )}
                      {item.serialNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-500 text-xs">Serial Number</p>
                            <p className="font-medium font-mono">{item.serialNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {depreciation && (
                      <div className="rounded-lg bg-slate-50 p-4 space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Depreciation Estimate
                        </p>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-slate-400">Est. Current Value</p>
                            <p className="font-semibold">{formatCurrency(depreciation.currentValue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Depreciated</p>
                            <p className="font-semibold text-red-600">
                              {(depreciation.depreciationPct * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Years Owned</p>
                            <p className="font-semibold">{depreciation.yearsOwned.toFixed(1)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photos tab — split into two clearly-labeled sections so users
                  can tell their own photos apart from web reference images. */}
              <TabsContent value="photos" className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-8">
                    {/* Your photos */}
                    <section className="space-y-3">
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">Your photos</h3>
                        <p className="text-xs text-slate-500">
                          Photos you&apos;ve taken of this item. These show its actual condition.
                        </p>
                      </div>
                      {userPhotos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {userPhotos.map((src, i) => (
                            <div
                              key={src}
                              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-300"
                            >
                              <Image
                                src={src}
                                alt={`Your photo ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="200px"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <PhotoUpload
                        itemId={item.id}
                        photos={currentPhotos}
                        onPhotosChange={setPhotoOverride}
                      />
                    </section>

                    {/* Web reference photos — only shown when present. */}
                    {webPhotos.length > 0 && (
                      <section className="space-y-3 pt-6 border-t border-slate-200">
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">
                            Reference photos from the web
                          </h3>
                          <p className="text-xs text-slate-500">
                            Stock images of this product — not photos of your specific item.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {webPhotos.map((src, i) => (
                            <div
                              key={src}
                              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300"
                            >
                              <Image
                                src={src}
                                alt={`Reference ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="200px"
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Maintenance tab */}
              <TabsContent value="maintenance" className="mt-4 space-y-3">
                {maintenance.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-slate-500">
                      <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No maintenance records yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  maintenance.map((record) => (
                    <MaintenanceCard
                      key={record.id}
                      record={record}
                      onMarkComplete={markMaintenanceDone}
                    />
                  ))
                )}
              </TabsContent>

              {/* Rentals tab */}
              <TabsContent value="rentals" className="mt-4 space-y-3">
                {rentals.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-slate-500">
                      <Tag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">This item isn't listed for rent</p>
                      <p className="text-xs mt-1">Visit the Rentals page to create a listing</p>
                    </CardContent>
                  </Card>
                ) : (
                  rentals.map((rental) => (
                    <RentalCard
                      key={rental.id}
                      listing={rental}
                      onToggle={toggleRental}
                      onDelete={deleteRental}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Item thumbnails — primary photo + up to 4 alternates */}
            {currentPhotos[0] ? (
              <div className="space-y-2">
                <div
                  className={cn(
                    "relative h-48 rounded-xl overflow-hidden bg-slate-100",
                    isUserPhoto(currentPhotos[0])
                      ? "border-2 border-slate-300"
                      : "border-2 border-dashed border-slate-300"
                  )}
                >
                  <Image
                    src={currentPhotos[0]}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>
                {currentPhotos.length > 1 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {currentPhotos.slice(1, 5).map((src, i) => (
                      <div
                        key={src}
                        className={cn(
                          "relative aspect-square rounded-md overflow-hidden bg-slate-100",
                          isUserPhoto(src)
                            ? "border-2 border-slate-300"
                            : "border-2 border-dashed border-slate-300"
                        )}
                      >
                        <Image
                          src={src}
                          alt={`${item.name} ${i + 2}`}
                          fill
                          className="object-cover"
                          sizes="100px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center">
                <Package className="h-16 w-16 text-slate-300" />
              </div>
            )}

            {/* Market Value */}
            <PriceDisplay itemId={item.id} initialData={marketValue} />
          </div>
        </div>
      </div>
    </div>
  );
}
