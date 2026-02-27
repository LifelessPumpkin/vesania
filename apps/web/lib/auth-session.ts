import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import prisma from "@/lib/prisma";
import type { User } from "@prisma/client";

export const SESSION_COOKIE_NAME = "session";

export async function verifyRequestAuth(
  req: NextRequest
): Promise<DecodedIdToken | null> {
  const adminAuth = getAdminAuth();

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    try {
      return await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      // Fall through to header auth.
    }
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(
  req: NextRequest
): Promise<{ session: DecodedIdToken; user: User } | null> {
  const session = await verifyRequestAuth(req);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { firebaseUid: session.uid },
  });
  if (!user) return null;

  return { session, user };
}

export async function verifyAdminAuth(
  req: NextRequest
): Promise<{ token: DecodedIdToken; user: User } | null> {
  const token = await verifyRequestAuth(req);
  if (!token) return null;

  const user = await prisma.user.findUnique({
    where: { firebaseUid: token.uid },
  });
  if (!user || user.role !== "ADMIN") return null;

  return { token, user };
}
