import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getItemById, updateItem } from "@/lib/services/items";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);
    const item = await getItemById(itemId);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", String(itemId));
    await mkdir(uploadDir, { recursive: true });

    const newPaths: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      await writeFile(join(uploadDir, filename), buffer);
      newPaths.push(`/uploads/${itemId}/${filename}`);
    }

    const updatedPhotos = [...item.photos, ...newPaths];
    const updated = await updateItem(itemId, { photos: updatedPhotos });

    return NextResponse.json({ data: { photos: updated?.photos ?? updatedPhotos } });
  } catch (err) {
    console.error("[POST /api/items/:id/photos]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
