# Match State Persistence — Implementation Plan

**Issue:** Persist match state for crash/disconnect recovery (#38)
**Date:** 2026-02-18

---

## Problem

Match state lives in an in-memory `Map` in `lib/game-server/match.ts`. If the server restarts (deploy, crash, dev reload), all active matches are lost. Players have no way to reconnect. The in-process `subscribers` Map also means pub/sub only works within a single server instance.

## Why Redis

Redis replaces three separate concerns with one tool:

| Current (in-memory)            | Redis replacement                        |
|--------------------------------|------------------------------------------|
| `matches` Map for state        | `GET`/`SET` with key `match:{id}`        |
| `subscribers` Map for SSE push | Redis Pub/Sub on channel `match:{id}`    |
| No cleanup / no TTL            | `EXPIRE` key with 15-minute TTL          |

Benefits:
- State survives server restarts — no rehydration logic needed
- Pub/Sub works across multiple server instances (scalability for free)
- Built-in TTL replaces manual cleanup crons
- No Prisma schema changes required

## Architecture Overview

```
Current flow:
  createMatch()  → matches.set(id, state)
  applyAction()  → mutate Map → for (cb of subscribers) cb(state)
  server restart → all state lost

Redis flow:
  createMatch()  → redis.set("match:{id}", state, EX 900)
  applyAction()  → redis.set(…) → redis.publish("match:{id}", state)
  stream route   → redis.subscribe("match:{id}") → push SSE to client
  server restart → state still in Redis, clients reconnect SSE
  15 min idle    → key auto-expires
```

---

## Step 1: Add Redis Client

**New file:** `apps/web/lib/redis.ts`

Set up a shared Redis client using `ioredis`:

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
export default redis;
```

- Add `REDIS_URL` to `.env` (e.g. `redis://localhost:6379` for dev)
- Install: `npm install ioredis`
- For pub/sub, you need a **separate client** for subscribing (ioredis requirement) — create a `createSubscriber()` helper that returns a new `Redis` instance

---

## Step 2: Replace In-Memory Map with Redis GET/SET

**File:** `apps/web/lib/game-server/match.ts`

Remove both Maps:
```diff
- const matches = new Map<string, MatchState>();
- const subscribers = new Map<string, Set<SSECallback>>();
```

Replace with Redis operations:

### createMatch(hostName) → async
```typescript
export async function createMatch(hostName: string): Promise<MatchState> {
  let matchId = generateCode();
  while (await redis.exists(`match:${matchId}`)) {
    matchId = generateCode();
  }

  const state: MatchState = {
    matchId,
    status: "waiting",
    players: { p1: { name: hostName, hp: 30, block: 0 }, p2: null },
    turn: "p1",
    log: [`${hostName} created the match. Waiting for opponent...`],
    winner: null,
  };

  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
  return state;
}
```

### getMatch(matchId) → async
```typescript
export async function getMatch(matchId: string): Promise<MatchState | null> {
  const data = await redis.get(`match:${matchId}`);
  return data ? JSON.parse(data) : null;
}
```

### joinMatch(matchId, guestName) → async
```typescript
export async function joinMatch(matchId: string, guestName: string): Promise<MatchState> {
  const state = await getMatch(matchId);
  if (!state) throw new Error("Match not found");
  if (state.status !== "waiting") throw new Error("Match is not accepting players");

  state.players.p2 = { name: guestName, hp: 30, block: 0 };
  state.status = "active";
  state.log.push(`${guestName} joined! ${state.players.p1.name}'s turn.`);

  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
  await redis.publish(`match:${matchId}`, JSON.stringify(state));
  return state;
}
```

### applyAction(matchId, playerId, action) → async
```typescript
export async function applyAction(
  matchId: string, playerId: PlayerId, action: ActionType
): Promise<MatchState> {
  const state = await getMatch(matchId);
  if (!state) throw new Error("Match not found");
  if (state.status !== "active") throw new Error("Match is not active");
  if (state.turn !== playerId) throw new Error("Not your turn");

  // ... existing combat logic (unchanged) ...

  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
  await redis.publish(`match:${matchId}`, JSON.stringify(state));
  return state;
}
```

Key details:
- Every `SET` refreshes the 900s (15 min) TTL — active matches stay alive
- `publish()` replaces the old `notifySubscribers()` loop
- The `subscribe()` and `notifySubscribers()` functions are deleted entirely

---

## Step 3: Update SSE Stream Route to Use Redis Pub/Sub

**File:** `apps/web/app/api/match/[id]/stream/route.ts`

Replace the in-process `subscribe()` call with a Redis subscription:

```typescript
import { getMatch } from "@/lib/game-server/match";
import { createSubscriber } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = await getMatch(id);

  if (!match) {
    return new Response(JSON.stringify({ error: "Match not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sub = createSubscriber();
  await sub.subscribe(`match:${id}`);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* stream closed */ }
      }

      // Send current state immediately
      send(JSON.stringify(match));

      // Listen for published updates
      sub.on("message", (_channel: string, message: string) => {
        send(message);
      });

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        sub.unsubscribe();
        sub.quit();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

Each SSE connection gets its own Redis subscriber. When the client disconnects, the subscriber is cleaned up. This scales across multiple server instances because Redis Pub/Sub fans out to all subscribers regardless of which process they live in.

---

## Step 4: Update API Routes for Async

The three mutation routes need to `await` the now-async functions:

**`app/api/match/create/route.ts`**
```diff
- const state = createMatch(playerName);
+ const state = await createMatch(playerName);
```

**`app/api/match/join/route.ts`**
```diff
- const state = joinMatch(matchId, playerName);
+ const state = await joinMatch(matchId, playerName);
```

**`app/api/match/[id]/action/route.ts`**
```diff
- const state = applyAction(id, playerId, type);
+ const state = await applyAction(id, playerId, type);
```

**`app/api/match/[id]/route.ts`** (GET match state)
```diff
- const match = getMatch(id);
+ const match = await getMatch(id);
```

---

## Step 5: Client-Side Reconnection

**File:** `apps/web/app/match/page.tsx`

The `EventSource` API auto-reconnects on disconnect. The stream route already sends current state on connect, so reconnection "just works" — the client gets the latest state from Redis on each new SSE connection.

Add two things:

### Connection status indicator
```typescript
es.onerror = () => setConnectionStatus("reconnecting");
es.onopen  = () => setConnectionStatus("connected");
```

### localStorage for page refresh recovery
```typescript
// On create/join:
localStorage.setItem("activeMatch", JSON.stringify({ matchId, playerId, playerName }));

// On page load:
const saved = localStorage.getItem("activeMatch");
if (saved) {
  const { matchId } = JSON.parse(saved);
  const res = await fetch(`/api/match/${matchId}`);
  if (res.ok) {
    // Match still alive in Redis — reconnect SSE and resume
  } else {
    // Match expired or finished — clear and show lobby
    localStorage.removeItem("activeMatch");
  }
}

// On match end or leave:
localStorage.removeItem("activeMatch");
```

---

## File Change Summary

| File | Change |
|------|--------|
| `lib/redis.ts` | **New** — shared Redis client + `createSubscriber()` |
| `lib/game-server/match.ts` | Replace Maps with Redis GET/SET/PUBLISH, make functions async, delete `subscribe()`/`notifySubscribers()` |
| `lib/game-server/types.ts` | Remove `SSECallback` type (no longer needed) |
| `app/api/match/[id]/stream/route.ts` | Use Redis Pub/Sub instead of in-process subscribe |
| `app/api/match/create/route.ts` | Await async `createMatch()` |
| `app/api/match/join/route.ts` | Await async `joinMatch()` |
| `app/api/match/[id]/action/route.ts` | Await async `applyAction()` |
| `app/api/match/[id]/route.ts` | Await async `getMatch()` |
| `app/match/page.tsx` | Add reconnection logic + localStorage |
| `.env` | Add `REDIS_URL` |
| `package.json` | Add `ioredis` dependency |

---

## TTL / Cleanup

No cron jobs or manual cleanup needed. Redis handles it:

- Every `SET` uses `EX 900` (15 minutes)
- Each action refreshes the TTL, so active matches never expire
- Abandoned matches auto-delete after 15 minutes of inactivity
- Finished matches can either expire naturally or be deleted immediately after the result screen is shown

---

## Testing Checklist

- [ ] Create a match, kill the dev server, restart — match is still in Redis
- [ ] Mid-game: close browser tab, reopen — resumes at correct turn via localStorage + SSE reconnect
- [ ] Both players disconnect and reconnect — state is consistent
- [ ] Idle match disappears after 15 minutes (check with `redis-cli TTL match:{id}`)
- [ ] Rapid actions don't cause race conditions (turn-based = naturally serialized)
- [ ] SSE stream properly cleans up Redis subscriber on client disconnect
