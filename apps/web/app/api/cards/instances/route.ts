
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdminAuth(req)
        if (!admin) {
            return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const cards = await prisma.card.findMany({
            include: {
                definition: true,
                owner: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({
            count: cards.length,
            cards
        })
    } catch (error) {
        console.error('Error fetching card instances:', error)
        return apiError('Error fetching card instances', 500, error)
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = await verifyAdminAuth(req)
        if (!admin) {
            return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 })
        }

        const body = await req.json()
        const { definitionId, publicCode } = body
        const quantity = Math.min(Math.max(parseInt(body.quantity) || 1, 1), 50)

        if (!definitionId) {
            return NextResponse.json({
                message: 'Missing required field: definitionId is required.'
            }, { status: 400 })
        }

        if (quantity === 1 && !publicCode) {
            return NextResponse.json({
                message: 'Missing required field: publicCode is required for single mint.'
            }, { status: 400 })
        }

        const definition = await prisma.cardDefinition.findUnique({
            where: { id: definitionId }
        })

        if (!definition) {
            return NextResponse.json({ message: 'Invalid definitionId. Card Definition not found.' }, { status: 404 })
        }

        if (quantity === 1 && publicCode) {
            const code = publicCode.startsWith('ves_') ? publicCode : `ves_${publicCode}`
            const existingCard = await prisma.card.findUnique({ where: { publicCode: code } })
            if (existingCard) {
                return NextResponse.json({ message: 'A card with this publicCode already exists.' }, { status: 409 })
            }
        }

        const mintedCards = await prisma.$transaction(async (tx) => {
            const cards: Awaited<ReturnType<typeof tx.card.create>>[] = []

            for (let i = 0; i < quantity; i++) {
                let code: string
                if (quantity === 1 && publicCode) {
                    code = publicCode.startsWith('ves_') ? publicCode : `ves_${publicCode}`
                } else {
                    code = `ves_${crypto.randomUUID().slice(0, 8)}`
                    while (await tx.card.findUnique({ where: { publicCode: code } })) {
                        code = `ves_${crypto.randomUUID().slice(0, 8)}`
                    }
                }

                const newCard = await tx.card.create({
                    data: {
                        id: `inst_${crypto.randomUUID()}`,
                        publicCode: code,
                        definitionId,
                    },
                    include: {
                        definition: true,
                        owner: true,
                    }
                })

                cards.push(newCard)
            }

            return cards
        })

        return NextResponse.json({
            message: `Successfully minted ${mintedCards.length} card(s)`,
            cards: mintedCards,
            card: mintedCards[0],
        }, { status: 201 })

    } catch (error) {
        console.error('Mint error:', error)
        return apiError('Error minting card', 500, error)
    }
}
