// Shared types for API responses and component props

// ─── Card & User Types ───────────────────────────────────────────────

export interface CardDefinition {
    id: string;
    name: string;
    type: string;
    rarity: string;
    description: string;
    effectJson: Record<string, unknown>;
    imageUrl: string | null;
}

export interface CardInstance {
    id: string;
    publicCode: string;
    status: string;
    createdAt: string;
    claimedAt: string | null;
    definition: CardDefinition;
    owner: { username: string; email: string } | null;
}

/** Card instance as returned by /api/my-cards (no owner, always belongs to requester) */
export interface MyCardInstance {
    id: string;
    publicCode: string;
    status: string;
    createdAt: string;
    claimedAt: string | null;
    definition: CardDefinition;
}

export interface UserRow {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { cards: number };
}

export interface AdminUser {
    id: string;
    username: string;
    email: string;
}

// ─── Deck Types ─────────────────────────────────────────────────────

export interface DeckSummary {
    id: string;
    name: string;
    cardCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface DeckCardEntry {
    id: string;
    position: number;
    card: {
        id: string;
        publicCode: string;
        definition: CardDefinition;
    };
}

export interface DeckDetail {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    cards: DeckCardEntry[];
}

// ─── Scan API Response ──────────────────────────────────────────────

export interface ScanResult {
    message: string;
    card?: {
        definition: { name: string; description: string };
        status: string;
    };
    definition?: { name: string; description: string };
    status?: string;
    alreadyOwned?: boolean;
    newlyClaimed?: boolean;
}

// ─── Generic API Shapes ─────────────────────────────────────────────

export interface ApiErrorResponse {
    message: string;
    error?: string;
}

