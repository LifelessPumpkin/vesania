'use server'

import prisma from '@/lib/prisma'

export async function getStoreCards() {
  return prisma.cardDefinition.findMany({
    orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
  })
}

export async function getUserOwnedDefinitionIds(firebaseUid: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: {
      cards: {
        select: { definitionId: true },
      },
    },
  })
  return user?.cards.map(c => c.definitionId) ?? []
}

export async function getUserGold(firebaseUid: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { gold: true },
  })
  return user?.gold ?? 0
}

export async function purchaseCards(
  firebaseUid: string,
  definitionIds: string[],
  totalCost: number
) {
  const user = await prisma.user.findUnique({ where: { firebaseUid } })
  if (!user) throw new Error('User not found')
  if (user.gold < totalCost) throw new Error('Insufficient gold')

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { gold: { decrement: totalCost } },
    }),
    ...definitionIds.map(definitionId =>
      prisma.card.updateMany({
        where: {
          definitionId,
          status: 'UNCLAIMED',
          ownerId: null,
        },
        data: {
          ownerId: user.id,
          status: 'CLAIMED',
          claimedAt: new Date(),
        },
      })
    ),
  ])
}

export async function purchaseDeck(firebaseUid: string, cost: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { firebaseUid } })
  if (!user) throw new Error('User not found')
  if (user.gold < cost) throw new Error('Insufficient gold')

  await prisma.user.update({
    where: { id: user.id },
    data: { gold: { decrement: cost } },
  })
}
