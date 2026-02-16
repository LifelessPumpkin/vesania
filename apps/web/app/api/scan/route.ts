import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyRequestAuth } from '@/lib/auth-session'

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyRequestAuth(req)
    if (!decodedToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    
    // Find the user in Postgres using the Firebase UID
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found. Please re-login.' }, { status: 404 })
    }


    const body = await req.json()
    const { code } = body // The frontend sends { code: "nfc-tag-content" }

    if (!code) {
      return NextResponse.json({ message: 'No card code provided' }, { status: 400 })
    }

    // search by 'publicCode' (your schema's unique field)
    const card = await prisma.card.findUnique({
      where: { publicCode: code },
      include: {
        owner: true,
        definition: true
      }
    })

    if (!card) {
      return NextResponse.json({ message: 'Invalid card code.' }, { status: 404 })
    }

    
    if (card.ownerId === user.id) {
      return NextResponse.json({ 
        message: 'You already collected this card!',
        card: card,
        alreadyOwned: true
      })
    }

    if (card.status === 'CLAIMED' || card.ownerId) {
      return NextResponse.json({ 
        message: 'This card has already been claimed by another player.' 
      }, { status: 409 }) // 409 Conflict
    }

    const updatedCard = await prisma.card.update({
      where: { id: card.id },
      data: {
        ownerId: user.id,
        status: 'CLAIMED',
        claimedAt: new Date(),
      },
      include: {
        definition: true
      }
    })

    return NextResponse.json({
      message: 'Card successfully claimed!',
      card: updatedCard,
      newlyClaimed: true
    })

  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json(
      { message: 'Internal Server Error', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}