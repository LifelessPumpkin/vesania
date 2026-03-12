
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type')
    const rarity = searchParams.get('rarity')

    const where: Record<string, unknown> = {}

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
    return apiError('Error fetching cards', 500, error)
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

    const customId = `def_${crypto.randomUUID()}`

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
    return apiError('Error creating card', 500, error)
  }
}