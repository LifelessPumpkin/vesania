import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/auth-session";
import { apiError } from "@/lib/api-helpers";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const definition = await prisma.cardDefinition.findUnique({
            where: { id },
        });

        if (!definition) {
            return NextResponse.json({ message: "Card definition not found" }, { status: 404 });
        }

        return NextResponse.json({ card: definition });
    } catch (error) {
        console.error("Error fetching card definition:", error);
        return apiError("Error fetching card definition", 500, error);
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await verifyAdminAuth(req);
        if (!admin) {
            return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        // Verify it exists
        const existing = await prisma.cardDefinition.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ message: "Card definition not found" }, { status: 404 });
        }

        // Build update data — only include fields that were provided
        const updateData: Record<string, unknown> = {};

        if (body.name !== undefined) updateData.name = body.name;
        if (body.type !== undefined) {
            const validTypes = ["CHARACTER", "ITEM", "SPELL", "TOOL"];
            if (!validTypes.includes(body.type)) {
                return NextResponse.json({ message: "Invalid card type" }, { status: 400 });
            }
            updateData.type = body.type;
        }
        if (body.rarity !== undefined) {
            const validRarities = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
            if (!validRarities.includes(body.rarity)) {
                return NextResponse.json({ message: "Invalid rarity" }, { status: 400 });
            }
            updateData.rarity = body.rarity;
        }
        if (body.description !== undefined) updateData.description = body.description;
        if (body.effectJson !== undefined) updateData.effectJson = body.effectJson;
        if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: "No fields to update" }, { status: 400 });
        }

        const updated = await prisma.cardDefinition.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            message: "Card definition updated",
            card: updated,
        });
    } catch (error) {
        console.error("Update error:", error);
        return apiError("Error updating card definition", 500, error);
    }
}
