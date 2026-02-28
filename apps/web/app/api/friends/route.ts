import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-session'
import { apiError } from '@/lib/api-helpers'

const ONLINE_WINDOW_MS = 2 * 60 * 1000

type FriendView = {
  id: string
  username: string
  email: string
  since: Date
  online: boolean
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { lastSeenAt: new Date() },
    })

    const now = Date.now()

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: auth.user.id }, { userBId: auth.user.id }],
      },
      include: {
        userA: { select: { id: true, username: true, email: true, lastSeenAt: true } },
        userB: { select: { id: true, username: true, email: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const friends: FriendView[] = friendships.map((friendship) => {
      const friend = friendship.userAId === auth.user.id ? friendship.userB : friendship.userA
      return {
        id: friend.id,
        username: friend.username,
        email: friend.email,
        since: friendship.createdAt,
        online: now - friend.lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
      }
    })

    return NextResponse.json({ count: friends.length, friends })
  } catch (error) {
    console.error('Error fetching friends:', error)
    return apiError('Internal Server Error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { lastSeenAt: new Date() },
    })

    const body = await req.json()
    const usernameRaw = typeof body?.username === 'string' ? body.username : ''
    const username = usernameRaw.trim()

    if (!username) {
      return NextResponse.json({ message: 'Username is required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, lastSeenAt: true },
    })

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (targetUser.id === auth.user.id) {
      return NextResponse.json({ message: 'You cannot add yourself as a friend' }, { status: 400 })
    }

    const [userAId, userBId] = [auth.user.id, targetUser.id].sort()

    const existing = await prisma.friendship.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ message: 'You are already friends with this user' }, { status: 409 })
    }

    const friendship = await prisma.friendship.create({
      data: {
        userAId,
        userBId,
      },
    })

    return NextResponse.json(
      {
        message: `Added ${targetUser.username} as a friend`,
        friend: {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
          since: friendship.createdAt,
          online: Date.now() - targetUser.lastSeenAt.getTime() <= ONLINE_WINDOW_MS,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding friend:', error)
    return apiError('Internal Server Error', 500)
  }
}
