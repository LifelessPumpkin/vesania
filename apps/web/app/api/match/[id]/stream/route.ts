import { getMatch, subscribe } from "@/lib/game-server/match";
import { MatchState } from "@/lib/game-server/types";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://10.132.54.139:3000",
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { "Access-Control-Allow-Origin": origin };
  }
  return {};
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatch(id);
  const cors = getCorsHeaders(request);

  if (!match) {
    return new Response(JSON.stringify({ error: "Match not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(state: MatchState) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch {
          // Stream closed, unsubscribe will clean up
        }
      }

      // Send current state immediately
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
      ...cors,
    },
  });
}
