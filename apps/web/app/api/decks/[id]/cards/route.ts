import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'
import { MAX_DECK_SIZE } from '@/lib/game-constants'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId } = await params

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
            include: {
                cards: {
                    include: {
                        card: {
                            include: { definition: true },
                        },
                    },
                    orderBy: { position: 'asc' },
                },
            },
        })

        if (!deck || deck.ownerId !== auth.user.id) {
            return NextResponse.json({ message: 'Deck not found' }, { status: 404 })
        }

        return NextResponse.json({ deck })
    } catch (error) {
        console.error('Error fetching deck cards:', error)
        return apiError('Internal Server Error', 500)
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId } = await params
        const body = await req.json()
        const { cardId } = body as { cardId?: string }

        if (!cardId) {
            return NextResponse.json({ message: 'cardId is required' }, { status: 400 })
        }

        // Verify deck ownership
        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
            include: { _count: { select: { cards: true } } },
        })

        if (!deck || deck.ownerId !== auth.user.id) {
            return NextResponse.json({ message: 'Deck not found' }, { status: 404 })
        }

        if (deck._count.cards >= MAX_DECK_SIZE) {
            return NextResponse.json(
                { message: `Deck is full (max ${MAX_DECK_SIZE} cards)` },
                { status: 400 }
            )
        }

        // Verify card ownership
        const card = await prisma.card.findUnique({ where: { id: cardId } })
        if (!card || card.ownerId !== auth.user.id) {
            return NextResponse.json(
                { message: 'Card not found or not owned by you' },
                { status: 400 }
            )
        }

        const deckCard = await prisma.deckCard.create({
            data: {
                deckId,
                cardId,
                position: deck._count.cards,
            },
            include: {
                card: { include: { definition: true } },
            },
        })

        return NextResponse.json({ message: 'Card added to deck', deckCard }, { status: 201 })
    } catch (error) {
        console.error('Error adding card to deck:', error)
        return apiError('Internal Server Error', 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthenticatedUser(req)
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const { id: deckId } = await params
        const { searchParams } = new URL(req.url)
        const cardId = searchParams.get('cardId')

        if (!cardId) {
            return NextResponse.json({ message: 'cardId is required' }, { status: 400 })
        }

        // Verify deck ownership
        const deck = await prisma.deck.findUnique({ where: { id: deckId } })
        if (!deck || deck.ownerId !== auth.user.id) {
            return NextResponse.json({ message: 'Deck not found' }, { status: 404 })
        }

        await prisma.deckCard.deleteMany({
            where: { deckId, cardId },
        })

        return NextResponse.json({ message: 'Card removed from deck' })
    } catch (error) {
        console.error('Error removing card from deck:', error)
        return apiError('Internal Server Error', 500)
    }
}
