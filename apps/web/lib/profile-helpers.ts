import type { Prisma } from '@prisma/client';

/** Shared Prisma select object for user profile queries (with _count for stats). */
export const USER_PROFILE_SELECT = {
    username: true,
    displayName: true,
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

type UserWithCounts = Prisma.UserGetPayload<{ select: typeof USER_PROFILE_SELECT }>;

/**
 * Transform a raw Prisma user (with _count) into a clean profile response body.
 * Shared between the own-profile and public-profile API routes.
 */
export function mapUserToProfile(user: UserWithCounts) {
    const { _count, ...profile } = user;
    return {
        ...profile,
        stats: {
            cardsOwned: _count.cards,
            decksBuilt: _count.decks,
            friendsCount: _count.friendLinksA + _count.friendLinksB,
        },
    };
}
