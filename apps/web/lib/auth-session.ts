import { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

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
