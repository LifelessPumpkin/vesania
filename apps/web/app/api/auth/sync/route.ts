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
    const adminAuth = getAdminAuth(); // <-- actually call it
    const decodedToken = await adminAuth.verifyIdToken(token); // <-- verify Firebase ID token
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: { email },
      create: {
        firebaseUid: uid,
        email: email || '',
        username: email?.split('@')[0] || '',
      },
    });

    const expiresIn = 1000 * 60 * 60 * 24 * 5; // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    const response = NextResponse.json({ user });
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