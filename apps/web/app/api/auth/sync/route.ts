import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}