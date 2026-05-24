import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ gold: auth.user.gold })
  } catch (error) {
    return apiError('Failed to fetch gold', 500, error)
  }
}
