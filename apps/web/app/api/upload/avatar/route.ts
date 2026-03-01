import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";
import { MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES, MIME_TO_EXT } from "@/lib/constants";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
            return NextResponse.json(
                { message: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
                { status: 400 }
            );
        }

        if (file.size > MAX_AVATAR_SIZE) {
            return NextResponse.json(
                { message: "File too large. Maximum size is 2MB." },
                { status: 400 }
            );
        }

        // Ensure upload directory exists
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Derive extension from MIME type (not user-supplied filename)
        const ext = MIME_TO_EXT[file.type] || "png";
        const filename = `${auth.user.id}.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        // Clean up any existing avatar files for this user (handles format changes)
        try {
            const existing = await readdir(UPLOAD_DIR);
            const userPrefix = `${auth.user.id}.`;
            for (const f of existing) {
                if (f.startsWith(userPrefix) && f !== filename) {
                    await unlink(path.join(UPLOAD_DIR, f));
                }
            }
        } catch {
            // Directory may not exist yet — safe to ignore
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filepath, buffer);

        const avatarUrl = `/uploads/avatars/${filename}`;

        return NextResponse.json({ avatarUrl, message: "Avatar uploaded" });
    } catch (error) {
        console.error("Avatar upload error:", error);
        return NextResponse.json(
            { message: "Failed to upload avatar" },
            { status: 500 }
        );
    }
}

