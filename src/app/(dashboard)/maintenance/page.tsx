"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
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
import { MaintenanceCard } from "@/components/maintenance/maintenance-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MaintenanceRecord } from "@/types";

async function fetchAllMaintenance(): Promise<MaintenanceRecord[]> {
  const res = await fetch("/api/maintenance");
  const { data } = await res.json();
  return data ?? [];
}

interface GuideCardProps {
  title: string;
  type: "diy" | "professional";
  description: string;
  estimatedCost?: string;
}

function GuideCard({ title, type, description, estimatedCost }: GuideCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
      <Wrench className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <Badge variant={type === "diy" ? "secondary" : "outline"} className="text-[10px]">
            {type === "diy" ? "DIY" : "Professional"}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        {estimatedCost && (
          <p className="text-xs text-green-600 mt-0.5">Est. cost: {estimatedCost}</p>
        )}
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [guides, setGuides] = useState<any[]>([]);
  const [guidesCategory, setGuidesCategory] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["maintenance"],
    queryFn: fetchAllMaintenance,
  });

  const pending = records.filter((r) => !r.completedDate);
  const completed = records.filter((r) => !!r.completedDate);

  const markDone = async (id: number) => {
    await fetch(`/api/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedDate: new Date().toISOString().split("T")[0] }),
    });
    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    toast.success("Marked as complete");
  };

  const fetchGuides = async (category: string) => {
    setGuidesCategory(category);
    const res = await fetch(`/api/maintenance/guides?category=${category}`);
    const { data } = await res.json();
    setGuides(data ?? []);
  };

  const CATEGORIES = ["electronics", "furniture", "appliances", "vehicles", "tools", "other"];

  return (
    <div>
      <Header
        title="Maintenance"
        description="Track service history and upcoming maintenance tasks"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Log Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Maintenance Record</DialogTitle>
              </DialogHeader>
              <CreateMaintenanceForm
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["maintenance"] });
                  setCreateOpen(false);
                  toast.success("Maintenance record created");
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-6">
        {/* Guides Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Maintenance Guides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={guidesCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchGuides(cat)}
                  className="capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>
            {guides.length > 0 && (
              <div className="space-y-2 mt-4">
                {guides.map((guide, i) => (
                  <GuideCard key={i} {...guide} />
                ))}
              </div>
            )}
            {guides.length === 0 && guidesCategory && (
              <p className="text-sm text-slate-500">Select a category to see guides</p>
            )}
            {!guidesCategory && (
              <p className="text-sm text-slate-400">
                Select a category above to browse relevant DIY and professional maintenance guides.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending Records */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">No pending maintenance tasks</p>
          ) : (
            <div className="space-y-2">
              {pending.map((record) => (
                <MaintenanceCard key={record.id} record={record} onMarkComplete={markDone} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Records */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Completed ({completed.length})
            </h2>
            <div className="space-y-2">
              {completed.map((record) => (
                <MaintenanceCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateMaintenanceFormProps {
  onSuccess: () => void;
}

function CreateMaintenanceForm({ onSuccess }: CreateMaintenanceFormProps) {
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"diy" | "professional">("diy");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: parseInt(itemId),
          title,
          description: description || undefined,
          type,
          scheduledDate: scheduledDate || undefined,
          cost: cost ? parseFloat(cost) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      onSuccess();
    } catch {
      toast.error("Failed to create record");
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
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Oil change"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as "diy" | "professional")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diy">DIY</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What needs to be done..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="scheduledDate">Scheduled Date</Label>
          <Input
            id="scheduledDate"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cost">Estimated Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Log Maintenance"}
      </Button>
    </form>
  );
}
