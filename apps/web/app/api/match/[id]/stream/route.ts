import { getMatch, subscribe } from "@/lib/game-server/match";
import { MatchState, toPublicState } from "@/lib/game-server/types";

export const dynamic = "force-dynamic"; //need this to avoid caching game state, would get stale state or break stream

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatch(id);

  if (!match) {
    return new Response(JSON.stringify({ error: "Match not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({ //allows for data to be pushed over an extended period of time
    start(controller) { //controller is like a pipe
      const encoder = new TextEncoder(); //converts strings into bytes

      // Strips tokens and pushes a state snapshot as an SSE data frame.
      // Tokens must NEVER appear in SSE frames — any browser tab subscribed
      // to this stream would see them, including spectators.
      // [REDIS INTEGRATION POINT] — when the subscriber callback receives a
      // raw JSON string from Redis PUBLISH instead of a MatchState object,
      // parse it first: toPublicState(JSON.parse(message))
      function send(state: MatchState) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(toPublicState(state))}\n\n`) //push bytes into stream
          );
        } catch {
          // Stream closed, unsubscribe will clean up
        }
      }

      // Send current state immediately on connect
      send(match);

      // Subscribe to future updates
      const unsubscribe = subscribe(id, send);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
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
