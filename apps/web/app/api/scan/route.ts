import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { message: 'Code is required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.findUnique({
      where: { publicCode: code },
      include: {
        definition: true,
        owner: true
      }
    })

    if (!card) {
      return NextResponse.json(
        { message: 'Card not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(card)

  } catch (error) {
    console.error('Error scanning card:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}