"use client";

import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ImageResult {
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
}

interface ImagePickerProps {
  images: ImageResult[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  isLoading?: boolean;
}

export function ImagePicker({ images, selectedUrl, onSelect, isLoading }: ImagePickerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching for product images…
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        Select a photo — or skip and upload your own
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {images.map((img) => {
          const isSelected = img.url === selectedUrl;
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => onSelect(isSelected ? "" : img.url)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
                isSelected
                  ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1"
                  : "border-slate-200 hover:border-slate-400"
              )}
              title={img.title}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).parentElement!.style.display = "none";
                }}
              />
              {isSelected && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                  <Check className="h-5 w-5 text-white drop-shadow" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selectedUrl && (
        <p className="text-xs text-slate-400">
          Selected image will be added to this item's photos.
        </p>
      )}
    </div>
  );
}
