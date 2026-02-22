import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { apiError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    // Simple database health check - query the database
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    return apiError('Database connection failed', 500, error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'pingDb') {
      await prisma.$queryRaw`SELECT 1`
      return NextResponse.json({
        success: true,
        message: 'Database ping successful'
      })
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('API error:', error)
    return apiError('Internal server error', 500, error)
  }
}
