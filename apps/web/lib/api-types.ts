// Shared types for API responses and component props

// ─── Card & User Types ───────────────────────────────────────────────

export interface CardDefinition {
    id: string;
    name: string;
    type: string;
    rarity: string;
    description: string;
    effectJson: Record<string, unknown>;
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
