# Known Issues

## Redis Pub/Sub Publishes Full Match State (Including Tokens)

**Status:** Noted — not yet addressed
**Severity:** Low (defense-in-depth)
**Files:** `lib/game-server/match.ts` lines where `redis.publish()` is called (joinMatch, applyAction)

`redis.publish(`match:${matchId}`, JSON.stringify(state))` sends the full `MatchState` including `p1Token` and `p2Token` over the Redis pub/sub channel. The SSE handler in `stream/route.ts` strips tokens via `toPublicState()` before sending to clients, so tokens never reach browsers.

However, any process with access to Redis that subscribes to `match:*` channels would receive the raw tokens. If Redis is trusted internal infrastructure this is acceptable. For defense-in-depth, consider calling `toPublicState()` before publishing so tokens never transit the channel at all. The trade-off is that `applyAction` and `joinMatch` would then need to publish the public state separately from storing the full state.
