import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/services/dashboard";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
