import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { adminAuth } from '@/lib/firebase-admin' // Import adminAuth

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    
    await adminAuth.verifyIdToken(token)

    const users = await prisma.user.findMany()
    return NextResponse.json(users)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Unauthorized or Failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 401 }
    )
  }
}
