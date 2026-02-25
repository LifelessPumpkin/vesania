
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyRequestAuth } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyRequestAuth(req)
    if (!decodedToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    let { code } = body

    if (!code) {
      return NextResponse.json({ message: 'No card code provided' }, { status: 400 })
    }

    if (!code.startsWith('ves_')) {
      code = `ves_${code}`
    }

    const card = await prisma.card.findUnique({
      where: { publicCode: code },
      include: {
        owner: true,
        definition: true
      }
    })

    if (!card) {
      return NextResponse.json({ message: 'Invalid card code' }, { status: 404 })
    }

    if (card.ownerId === user.id) {
      return NextResponse.json({
        message: 'You already collected this card!',
        card: card,
        alreadyOwned: true
      })
    }

    if (card.ownerId && card.ownerId !== user.id) {
      return NextResponse.json({
        message: 'This card has already been claimed by another player.'
      }, { status: 409 })
    }

    const updatedCard = await prisma.card.update({
      where: { id: card.id },
      data: {
        owner: {
          connect: { id: user.id }
        },
        claimedAt: new Date(),
        status: 'CLAIMED',
      },
      include: {
        definition: true,
        owner: true,
      }
    })

    return NextResponse.json({
      message: 'Card successfully claimed!',
      card: updatedCard,
      newlyClaimed: true
    })

  } catch (error) {
    console.error('Scan error:', error)
    return apiError('Internal Server Error', 500, error)
  }
}