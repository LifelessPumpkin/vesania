
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyRequestAuth } from '@/lib/auth-session'

export async function GET(req: NextRequest) {
  try {
    const session = await verifyRequestAuth(req)
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: session.uid },
      include: {
        cards: {
          include: {
            definition: true,
          },
          orderBy: {
            claimedAt: 'desc',
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      count: user.cards.length,
      cards: user.cards
    })

  } catch (error) {
    console.error('Inventory error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}