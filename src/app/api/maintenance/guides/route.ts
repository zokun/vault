import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceGuides } from "@/lib/services/maintenance";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "other";
  const guides = getMaintenanceGuides(category);
  return NextResponse.json({ data: guides });
}
