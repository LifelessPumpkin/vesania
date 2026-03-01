import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { apiError } from "@/lib/api-helpers";
import { USERNAME_REGEX, MAX_DISPLAY_NAME_LENGTH, MAX_BIO_LENGTH } from "@/lib/constants";
import { USER_PROFILE_SELECT, mapUserToProfile } from "@/lib/profile-helpers";

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: auth.user.id },
            select: {
                ...USER_PROFILE_SELECT,
                id: true,
                profileComplete: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(mapUserToProfile(user));
    } catch (error) {
        console.error("Error fetching profile:", error);
        return apiError("Failed to fetch profile", 500, error);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req);
        if (!auth) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { username, displayName, bio, avatarUrl } = body;

        // Validate username if provided
        if (username !== undefined) {
            if (typeof username !== "string" || !USERNAME_REGEX.test(username)) {
                return NextResponse.json(
                    { message: "Username must be 3-20 characters, alphanumeric and underscores only." },
                    { status: 400 }
                );
            }
            // Check uniqueness (excluding current user)
            const existing = await prisma.user.findUnique({
                where: { username },
            });
            if (existing && existing.id !== auth.user.id) {
                return NextResponse.json(
                    { message: "Username is already taken." },
                    { status: 409 }
                );
            }
        }

        // Validate displayName
        if (displayName !== undefined && typeof displayName === "string" && displayName.length > MAX_DISPLAY_NAME_LENGTH) {
            return NextResponse.json(
                { message: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less.` },
                { status: 400 }
            );
        }

        // Validate bio
        if (bio !== undefined && typeof bio === "string" && bio.length > MAX_BIO_LENGTH) {
            return NextResponse.json(
                { message: `Bio must be ${MAX_BIO_LENGTH} characters or less.` },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (username !== undefined) updateData.username = username;
        if (displayName !== undefined) updateData.displayName = displayName || null;
        if (bio !== undefined) updateData.bio = bio || null;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
        updateData.profileComplete = true;

        const updated = await prisma.user.update({
            where: { id: auth.user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                bio: true,
                profileComplete: true,
                role: true,
            },
        });

        return NextResponse.json({ user: updated, message: "Profile updated" });
    } catch (error) {
        console.error("Error updating profile:", error);
        return apiError("Failed to update profile", 500, error);
    }
}

