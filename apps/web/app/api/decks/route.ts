import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'
import { MAX_DECK_SIZE } from '@/lib/game-constants'

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const decks = await prisma.deck.findMany({
            where: { ownerId: auth.user.id },
            include: { _count: { select: { cards: true } } },
            orderBy: { updatedAt: 'desc' },
        })

        return NextResponse.json({
            decks: decks.map((d) => ({
                id: d.id,
                name: d.name,
                cardCount: d._count.cards,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })),
        })
    } catch (error) {
        console.error('Error fetching decks:', error)
        return apiError('Internal Server Error', 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { name, cardIds } = body as { name?: string; cardIds?: string[] }

        if (!name || !name.trim()) {
            return NextResponse.json({ message: 'Deck name is required' }, { status: 400 })
        }

        if (cardIds && cardIds.length > MAX_DECK_SIZE) {
            return NextResponse.json(
                { message: `A deck cannot contain more than ${MAX_DECK_SIZE} cards` },
                { status: 400 }
            )
        }

        // Validate that all provided cards belong to this user
        if (cardIds && cardIds.length > 0) {
            const ownedCards = await prisma.card.count({
                where: { id: { in: cardIds }, ownerId: auth.user.id },
            })
            if (ownedCards !== cardIds.length) {
                return NextResponse.json(
                    { message: 'One or more cards do not belong to you' },
                    { status: 400 }
                )
            }
        }

        const deck = await prisma.deck.create({
            data: {
                name: name.trim(),
                ownerId: auth.user.id,
                cards: cardIds
                    ? {
                        create: cardIds.map((cardId, i) => ({
                            cardId,
                            position: i,
                        })),
                    }
                    : undefined,
            },
            include: { _count: { select: { cards: true } } },
        })

        return NextResponse.json(
            {
                message: 'Deck created',
                deck: {
                    id: deck.id,
                    name: deck.name,
                    cardCount: deck._count.cards,
                    createdAt: deck.createdAt,
                    updatedAt: deck.updatedAt,
                },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating deck:', error)
        return apiError('Internal Server Error', 500)
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const deckId = searchParams.get('id')

        if (!deckId) {
            return NextResponse.json({ message: 'Deck id is required' }, { status: 400 })
        }

        const deck = await prisma.deck.findUnique({ where: { id: deckId } })

        if (!deck || deck.ownerId !== auth.user.id) {
            return NextResponse.json({ message: 'Deck not found' }, { status: 404 })
        }

        await prisma.deck.delete({ where: { id: deckId } })

        return NextResponse.json({ message: 'Deck deleted' })
    } catch (error) {
        console.error('Error deleting deck:', error)
        return apiError('Internal Server Error', 500)
    }
}
