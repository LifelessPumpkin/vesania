import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequestAuth } from "@/lib/auth-session";

export const dynamic = "force-dynamic"; // prevents build-time evaluation weirdness

export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyRequestAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Unauthorized or Failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 401 }
    );
  }
}