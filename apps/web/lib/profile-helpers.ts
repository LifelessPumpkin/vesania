import type { Prisma } from '@prisma/client';

/** Shared Prisma select object for user profile queries (with _count for stats). */
export const USER_PROFILE_SELECT = {
    username: true,
    avatarUrl: true,
    bio: true,
    createdAt: true,
    _count: {
        select: {
            cards: true,
            decks: true,
            friendLinksA: true,
            friendLinksB: true,
        },
    },
} satisfies Prisma.UserSelect;

type UserWithCounts = Prisma.UserGetPayload<{ select: typeof USER_PROFILE_SELECT }> & {
    id?: string;
    wins?: number | null;
    losses?: number | null;
    gamesPlayed?: number | null;
    mmr?: number | null;
};

/**
 * Transform a raw Prisma user (with _count) into a clean profile response body.
 * Shared between the own-profile and public-profile API routes.
 */
export function mapUserToProfile(user: UserWithCounts) {
    const profileSource = { ...user };
    delete profileSource.id;
    const {
        _count,
        wins,
        losses,
        gamesPlayed,
        mmr,
        ...profile
    } = profileSource;
    return {
        ...profile,
        stats: {
            cardsOwned: _count.cards,
            decksBuilt: _count.decks,
            friendsCount: _count.friendLinksA + _count.friendLinksB,
            wins: wins ?? 0,
            losses: losses ?? 0,
            gamesPlayed: gamesPlayed ?? 0,
            mmr: mmr ?? 1000,
        },
    };
}

export const TOP_CARD_USAGE_INCLUDE = {
    card: {
        include: {
            definition: true,
        },
    },
} satisfies Prisma.UserCardUsageInclude;

export type TopCardUsage = Prisma.UserCardUsageGetPayload<{
    include: typeof TOP_CARD_USAGE_INCLUDE;
}>;

export function mapTopCards(topCards: TopCardUsage[]) {
    return topCards.map((entry) => ({
        cardId: entry.cardId,
        playCount: entry.playCount,
        definition: entry.card.definition,
    }));
}
