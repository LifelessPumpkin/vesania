import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-helpers";
import {
    USER_PROFILE_SELECT,
    TOP_CARD_USAGE_INCLUDE,
    mapTopCards,
    mapUserToProfile,
} from "@/lib/profile-helpers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                ...USER_PROFILE_SELECT,
                id: true,
            },
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const userCardUsage = (
            prisma as typeof prisma & {
                userCardUsage?: {
                    findMany: (args: {
                        where: { userId: string };
                        orderBy: Array<{ playCount: "desc" } | { updatedAt: "desc" }>;
                        take: number;
                        include: typeof TOP_CARD_USAGE_INCLUDE;
                    }) => Promise<Parameters<typeof mapTopCards>[0]>;
                };
            }
        ).userCardUsage;

        const topCards = userCardUsage
            ? await userCardUsage.findMany({
                where: { userId: user.id },
                orderBy: [{ playCount: "desc" }, { updatedAt: "desc" }],
                take: 3,
                include: TOP_CARD_USAGE_INCLUDE,
            })
            : [];

        return NextResponse.json({
            ...mapUserToProfile(user),
            topCards: mapTopCards(topCards),
        });
    } catch (error) {
        console.error("Error fetching public profile:", error);
        return apiError("Failed to fetch profile", 500, error);
    }
}
