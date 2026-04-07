import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
    try {
        const adminAuth = await verifyAdminAuth(req)
        if (!adminAuth) {
            return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const definitions = await prisma.cardDefinition.findMany()

        if (definitions.length === 0) {
            return NextResponse.json({ message: 'No card definitions found to mint' }, { status: 400 })
        }

        const mintedCards = await prisma.$transaction(async (tx) => {
            const newCards = []
            
            for (const def of definitions) {
                // Mint 2 of each
                for (let i = 0; i < 2; i++) {
                    let code = `ves_${crypto.randomUUID().slice(0, 8)}`
                    while (await tx.card.findUnique({ where: { publicCode: code } })) {
                        code = `ves_${crypto.randomUUID().slice(0, 8)}`
                    }

                    const card = await tx.card.create({
                        data: {
                            id: `inst_${crypto.randomUUID()}`,
                            publicCode: code,
                            definitionId: def.id,
                            ownerId: adminAuth.user.id,
                        },
                        include: {
                            definition: true,
                            owner: true,
                        }
                    })
                    newCards.push(card)
                }
            }
            return newCards
        }, {
            timeout: 20000, // 20s timeout in case there are many cards
        })

        return NextResponse.json({
            message: `Successfully minted ${mintedCards.length} cards to admin`,
            cards: mintedCards,
        }, { status: 201 })

    } catch (error) {
        console.error('Mint all error:', error)
        return apiError('Error minting all cards', 500, error)
    }
}
