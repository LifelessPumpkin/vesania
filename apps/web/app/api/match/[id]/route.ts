import { NextResponse } from "next/server";
import { getMatch } from "@/lib/game-server/match";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = getMatch(id);
  if (!state) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}
