import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'
import { getEffectSchemaByType } from '@/lib/card-effect-schemas'
import { CardType } from '@/lib/enums'

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdminAuth(req)
    if (!admin) {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { cards } = body

    if (!Array.isArray(cards)) {
      return NextResponse.json({ message: 'Payload must contain a "cards" array' }, { status: 400 })
    }

    // Prepare data for insertion and run schema validation
    const cardsToInsert = []

    for (let i = 0; i < cards.length; i++) {
        const item = cards[i]
        const { name, type, rarity, description, effectJson } = item

        if (!name || !type || !rarity || !description) {
            return NextResponse.json({ message: `Missing required fields at index ${i}` }, { status: 400 })
        }

        if (!Object.values(CardType).includes(type)) {
            return NextResponse.json({ message: `Invalid card type at index ${i}: ${type}` }, { status: 400 })
        }

        // Validate effectJson using existing Zod schemas
        try {
            const effectSchema = getEffectSchemaByType(type as CardType)
            const validatedEffect = effectSchema.parse(effectJson || {})
            
            const customId = `def_${crypto.randomUUID()}`
            cardsToInsert.push({
                id: customId,
                name,
                type,
                rarity,
                description,
                effectJson: validatedEffect,
            })
        } catch (validationError: any) {
             return NextResponse.json({ 
                 message: `Validation failed at index ${i} (${name})`, 
                 error: validationError.errors || validationError.message 
             }, { status: 400 })
        }
    }

    // Insert all inside a transaction
    await prisma.$transaction(
      cardsToInsert.map((cardData) => 
        prisma.cardDefinition.create({ data: cardData })
      )
    )

    return NextResponse.json({
      message: `Successfully created ${cardsToInsert.length} card definitions`,
      count: cardsToInsert.length,
    }, { status: 201 })

  } catch (error) {
    console.error('Bulk create error:', error)
    return apiError('Error in bulk creation', 500, error)
  }
}
