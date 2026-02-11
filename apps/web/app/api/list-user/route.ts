import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic"; // prevents build-time evaluation weirdness

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization"); // header keys are case-insensitive
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminAuth = getAdminAuth(); // <-- actually call it
    await adminAuth.verifyIdToken(token); // <-- verify Firebase ID token

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