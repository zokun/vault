"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PhotoUploadProps {
  itemId: number;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function PhotoUpload({ itemId, photos, onPhotosChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));

      const res = await fetch(`/api/items/${itemId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { data } = await res.json();
      onPhotosChange(data.photos);
      toast.success("Photos uploaded successfully");
    } catch {
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-md overflow-hidden bg-slate-100">
              <Image src={src} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="120px" />
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-6 text-slate-500 hover:border-slate-300 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="h-8 w-8" />
        <p className="text-sm">
          {uploading ? "Uploading..." : "Click to upload photos"}
        </p>
        <p className="text-xs text-slate-400">PNG, JPG, WebP up to 10MB each</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
