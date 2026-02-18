
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminAuth } from '@/lib/auth-session'

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
        return NextResponse.json({
            message: 'Error fetching card instances',
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
        let { definitionId, publicCode } = body

        if (!definitionId || !publicCode) {
            return NextResponse.json({
                message: 'Missing required fields: definitionId and publicCode are required.'
            }, { status: 400 })
        }

        if (!publicCode.startsWith('ves_')) {
            publicCode = `ves_${publicCode}`
        }

        const definition = await prisma.cardDefinition.findUnique({
            where: { id: definitionId }
        })

        if (!definition) {
            return NextResponse.json({ message: 'Invalid definitionId. Card Definition not found.' }, { status: 404 })
        }

        const existingCard = await prisma.card.findUnique({
            where: { publicCode }
        })
        if (existingCard) {
            return NextResponse.json({ message: 'A card with this publicCode already exists.' }, { status: 409 })
        }

        const customId = `inst_${Math.random().toString(36).substring(2, 10)}`

        const newCard = await prisma.card.create({
            data: {
                id: customId,
                publicCode,
                definitionId,
            },
            include: {
                definition: true
            }
        })

        return NextResponse.json({
            message: 'New physical card minted successfully',
            card: newCard
        }, { status: 201 })

    } catch (error) {
        console.error('Mint error:', error)
        return NextResponse.json({
            message: 'Error minting card',
            error: error instanceof Error ? error.message : 'Unknown'
        }, { status: 500 })
    }
}
