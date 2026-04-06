import prisma from "@/lib/prisma";

export async function resolveDeckCardIdsForUser(userId: string, deckId?: string | null) {
  const deck = await prisma.deck.findFirst({
    where: {
      ownerId: userId,
      ...(deckId ? { id: deckId } : {}),
    },
    select: {
      cards: {
        orderBy: { position: "asc" },
        select: { cardId: true },
      },
    },
    orderBy: deckId ? undefined : { updatedAt: "desc" },
  });

  return deck?.cards.map((card) => card.cardId) ?? [];
}
