import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim() || ''
    const sort = searchParams.get('sort') || 'name-asc'

    // Build where clause
    const where: Prisma.CardWhereInput = {
      ownerId: auth.user.id,
    }

    if (query) {
      where.definition = {
        name: { contains: query, mode: 'insensitive' },
      }
    }

    // Build orderBy from sort param
    type SortableField = 'name' | 'rarity' | 'type'
    const [field, direction] = sort.split('-') as [string, string]
    const validFields: SortableField[] = ['name', 'rarity', 'type']
    const sortField: SortableField = validFields.includes(field as SortableField)
      ? (field as SortableField)
      : 'name'
    const sortDir: 'asc' | 'desc' = direction === 'desc' ? 'desc' : 'asc'

    const cards = await prisma.card.findMany({
      where,
      include: { definition: true },
      orderBy: {
        definition: { [sortField]: sortDir },
      },
    })

    return NextResponse.json({
      count: cards.length,
      cards,
    })
  } catch (error) {
    console.error('Inventory error:', error)
    return apiError('Internal Server Error', 500)
  }
}