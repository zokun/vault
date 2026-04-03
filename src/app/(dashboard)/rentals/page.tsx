"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RentalCard } from "@/components/rentals/rental-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RentalListing } from "@/types";

async function fetchRentals(): Promise<RentalListing[]> {
  const res = await fetch("/api/rentals");
  const { data } = await res.json();
  return data ?? [];
}

export default function RentalsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["rentals"],
    queryFn: fetchRentals,
  });

  const active = rentals.filter((r) => r.isActive);
  const inactive = rentals.filter((r) => !r.isActive);

  const toggleRental = async (id: number, isActive: boolean) => {
    await fetch(`/api/rentals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    toast.success(isActive ? "Listing activated" : "Listing deactivated");
  };

  const deleteRental = async (id: number) => {
    await fetch(`/api/rentals/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["rentals"] });
    toast.success("Listing removed");
  };

  return (
    <div>
      <Header
        title="Rentals"
        description={`${active.length} active listing${active.length !== 1 ? "s" : ""}`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Listing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Rental Listing</DialogTitle>
              </DialogHeader>
              <CreateRentalForm
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["rentals"] });
                  setCreateOpen(false);
                  toast.success("Rental listing created");
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-6">
        {rentals.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Tag className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium mb-2">No rental listings yet</p>
            <p className="text-sm mb-6">List your items to earn passive income</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Listing
            </Button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">
                  Active Listings ({active.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((listing) => (
                    <RentalCard
                      key={listing.id}
                      listing={listing}
                      onToggle={toggleRental}
                      onDelete={deleteRental}
                    />
                  ))}
                </div>
              </div>
            )}

            {inactive.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">
                  Inactive ({inactive.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inactive.map((listing) => (
                    <RentalCard
                      key={listing.id}
                      listing={listing}
                      onToggle={toggleRental}
                      onDelete={deleteRental}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface CreateRentalFormProps {
  onSuccess: () => void;
}

function CreateRentalForm({ onSuccess }: CreateRentalFormProps) {
  const [itemId, setItemId] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [availableFrom, setAvailableFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [availableTo, setAvailableTo] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: parseInt(itemId),
          pricePerDay: parseFloat(pricePerDay),
          availableFrom,
          availableTo: availableTo || undefined,
          description: description || undefined,
          contactInfo: contactInfo || undefined,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      onSuccess();
    } catch {
      toast.error("Failed to create listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="itemId">Item ID *</Label>
        <Input
          id="itemId"
          type="number"
          placeholder="Enter item ID"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          required
        />
        <p className="text-xs text-slate-400">Find the item ID in the catalog URL</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pricePerDay">Price per Day ($) *</Label>
        <Input
          id="pricePerDay"
          type="number"
          step="0.01"
          placeholder="25.00"
          value={pricePerDay}
          onChange={(e) => setPricePerDay(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="availableFrom">Available From *</Label>
          <Input
            id="availableFrom"
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="availableTo">Available Until</Label>
          <Input
            id="availableTo"
            type="date"
            value={availableTo}
            onChange={(e) => setAvailableTo(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what's included, pickup/dropoff details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contactInfo">Contact Info</Label>
        <Input
          id="contactInfo"
          placeholder="Email or phone number"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Listing"}
      </Button>
    </form>
  );
}
