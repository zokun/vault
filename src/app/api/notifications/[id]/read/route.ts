import { NextRequest, NextResponse } from "next/server";
import { markRead } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await markRead(parseInt(id));
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
