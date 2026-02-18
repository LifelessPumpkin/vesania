
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type')
    const rarity = searchParams.get('rarity')

    const where: any = {}

    if (query) {
      where.name = {
        contains: query,
        mode: 'insensitive',
      }
    }

    const validTypes = ['CHARACTER', 'ITEM', 'SPELL', 'TOOL']
    if (type && validTypes.includes(type)) {
      where.type = type
    }

    const validRarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
    if (rarity && validRarities.includes(rarity)) {
      where.rarity = rarity
    }

    const cards = await prisma.cardDefinition.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ cards })
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json({
      message: 'Error fetching cards',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminAuth(req)
    if (!admin) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, rarity, description, effectJson } = body

    if (!name || !type || !rarity || !description) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const customId = `def_${Math.random().toString(36).substring(2, 10)}`

    const newDefinition = await prisma.cardDefinition.create({
      data: {
        id: customId,
        name,
        type,
        rarity,
        description,
        effectJson: effectJson || {},
      },
    })

    return NextResponse.json({
      message: 'Card definition created',
      card: newDefinition
    }, { status: 201 })

  } catch (error) {
    console.error('Create error:', error)
    return NextResponse.json({
      message: 'Error creating card',
      error: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}