import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const photoURL = decodedToken.picture || null;

    // Check if this email should be auto-promoted to ADMIN
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isBootstrapAdmin = email && adminEmails.includes(email.toLowerCase());

    // Check if user already exists (to detect first-time sign-in)
    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        email,
        lastSeenAt: new Date(),
        ...(isBootstrapAdmin ? { role: 'ADMIN' } : {}),
      },
      create: {
        firebaseUid: uid,
        email: email || '',
        username: email?.split('@')[0] || uid.slice(0, 8),
        avatarUrl: photoURL,
        profileComplete: false,
        lastSeenAt: new Date(),
        ...(isBootstrapAdmin ? { role: 'ADMIN' } : {}),
      },
    });

    const expiresIn = 1000 * 60 * 60 * 24 * 5; // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        profileComplete: user.profileComplete,
      },
      isNewUser: !existingUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });

    return response;
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}