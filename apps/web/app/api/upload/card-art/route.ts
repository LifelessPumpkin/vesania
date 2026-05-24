import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth-session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "card-art");

export async function POST(req: NextRequest) {
    try {
        const admin = await verifyAdminAuth(req);
        if (!admin) {
            return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const definitionId = formData.get("definitionId") as string | null;

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        if (!definitionId) {
            return NextResponse.json({ message: "No definitionId provided" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { message: "Invalid file type. Use PNG, JPEG, or WebP." },
                { status: 400 }
            );
        }

        // Max 5 MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { message: "File too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Verify definition exists
        const definition = await prisma.cardDefinition.findUnique({
            where: { id: definitionId },
        });

        if (!definition) {
            return NextResponse.json({ message: "Card definition not found" }, { status: 404 });
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Derive extension from MIME type
        const extMap: Record<string, string> = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/webp": "webp",
        };
        const ext = extMap[file.type] || "png";
        const filename = `${definitionId}.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filepath, buffer);

        const imageUrl = `/uploads/card-art/${filename}`;

        // Update the card definition with the new image URL
        await prisma.cardDefinition.update({
            where: { id: definitionId },
            data: { imageUrl },
        });

        return NextResponse.json({ imageUrl, message: "Card art uploaded" });
    } catch (error) {
        console.error("Card art upload error:", error);
        return NextResponse.json(
            { message: "Failed to upload card art" },
            { status: 500 }
        );
    }
}
