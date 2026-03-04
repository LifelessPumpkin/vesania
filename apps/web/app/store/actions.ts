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

export async function purchaseCards(firebaseUid: string, definitionIds: string[]) {
  const user = await prisma.user.findUnique({ where: { firebaseUid } })
  if (!user) throw new Error('User not found')

  // Find one UNCLAIMED card per definition and claim it
  await prisma.$transaction(
    definitionIds.map(definitionId =>
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
    )
  )
}