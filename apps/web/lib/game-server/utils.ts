import crypto from "crypto";
import type { PlayerId, EntityId } from "./types";

export function makeEventId(): string {
  return crypto.randomUUID();
}

export function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === "p1" ? "p2" : "p1";
}

export function getCharacterEntityId(playerId: PlayerId): EntityId {
  return `${playerId}:character`;
}
