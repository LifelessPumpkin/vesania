import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-helpers";
import { USER_PROFILE_SELECT, mapUserToProfile } from "@/lib/profile-helpers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: USER_PROFILE_SELECT,
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(mapUserToProfile(user));
    } catch (error) {
        console.error("Error fetching public profile:", error);
        return apiError("Failed to fetch profile", 500, error);
    }
}

