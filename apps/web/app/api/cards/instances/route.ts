
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
        const { definitionId } = body
        let { publicCode } = body

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

        const customId = `inst_${crypto.randomUUID()}`

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
        return apiError('Error minting card', 500, error)
    }
}
