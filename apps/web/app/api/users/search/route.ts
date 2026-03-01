import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { apiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const query = req.nextUrl.searchParams.get("q")?.trim();
        if (!query || query.length < 2) {
            return NextResponse.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: auth.user.id } }, // exclude self
                    { profileComplete: true },
                    {
                        OR: [
                            { username: { contains: query, mode: "insensitive" } },
                            { displayName: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            },
            select: {
                username: true,
                displayName: true,
                avatarUrl: true,
            },
            take: 10,
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Error searching users:", error);
        return apiError("Failed to search users", 500, error);
    }
}
