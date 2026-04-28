"use client";

import { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  itemId: number;
  /** Existing full photo list — POSTed back updated with the new uploads. */
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function PhotoUpload({ itemId, onPhotosChange }: PhotoUploadProps) {
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
    <>
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
    </>
  );
}
