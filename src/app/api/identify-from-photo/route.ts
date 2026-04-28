import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import heicConvert from "heic-convert";
import { identifyItemsFromPhoto } from "@/lib/ai/item-lookup";
import { searchProductImages } from "@/lib/services/image-search";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const HEIC_MIME = new Set(["image/heic", "image/heif"]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB pre-conversion (HEIC files can be large)

type ClaudeMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }
    console.log(
      `[identify-from-photo] received file: name=${file.name} type=${file.type} size=${file.size}`
    );
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 25MB)` },
        { status: 400 }
      );
    }

    const isHeic = HEIC_MIME.has(file.type);
    if (!ALLOWED_MIME.has(file.type) && !isHeic) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type || "unknown"}` },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Convert HEIC/HEIF → JPEG so it works for both storage and Claude vision.
    let buffer: Buffer;
    let outMime: ClaudeMime;
    let outExt: string;
    if (isHeic) {
      const converted = await heicConvert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.9,
      });
      buffer = Buffer.from(converted);
      outMime = "image/jpeg";
      outExt = "jpg";
      console.log(
        `[identify-from-photo] converted HEIC → JPEG (${(buffer.length / 1024).toFixed(0)}KB)`
      );
    } else {
      buffer = inputBuffer;
      outMime = file.type as ClaudeMime;
      outExt = file.type.split("/")[1] || "jpg";
    }

    // Persist to /uploads/pending/<uuid>/<safeName> so the URL can be slotted
    // straight into the item's photos array on submit.
    const id = randomUUID();
    const dir = join(process.cwd(), "public", "uploads", "pending", id);
    await mkdir(dir, { recursive: true });
    const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
    const safeBase = baseName.replace(/[^a-z0-9]/gi, "_") || "photo";
    const safeName = `${safeBase}.${outExt}`;
    await writeFile(join(dir, safeName), buffer);
    const photoUrl = `/uploads/pending/${id}/${safeName}`;

    const identifications = await identifyItemsFromPhoto(
      buffer.toString("base64"),
      outMime
    );

    // For multi-item photos, fetch a per-item web reference image so each item
    // gets a distinct primary thumbnail in the catalog. The source scene photo
    // is still saved as a secondary user photo. Skipped for single-item photos
    // (no ambiguity — the user's photo IS the item).
    let identificationsWithPhotos: Array<
      (typeof identifications)[number] & { webPhotoUrl: string | null }
    >;
    if (identifications.length >= 2) {
      const webResults = await Promise.allSettled(
        identifications.map((it) => searchProductImages(it.name))
      );
      identificationsWithPhotos = identifications.map((it, i) => {
        const r = webResults[i];
        const url =
          r.status === "fulfilled" && r.value.length > 0 ? r.value[0].url : null;
        return { ...it, webPhotoUrl: url };
      });
    } else {
      identificationsWithPhotos = identifications.map((it) => ({
        ...it,
        webPhotoUrl: null,
      }));
    }

    return NextResponse.json({
      data: { photoUrl, identifications: identificationsWithPhotos },
    });
  } catch (err) {
    console.error("[POST /api/identify-from-photo]", err);
    const msg = err instanceof Error ? err.message : "Identification failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
