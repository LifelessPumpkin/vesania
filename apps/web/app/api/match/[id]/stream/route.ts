import { getMatch } from "@/lib/game-server/match";
import { createSubscriber } from "@/lib/redis";
import { MatchState, toPublicState } from "@/lib/game-server/types";

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

      // Strips tokens before pushing each SSE frame — tokens must never leave the server.
      function send(state: MatchState) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(toPublicState(state))}\n\n`));
        } catch {
          // Stream closed
        }
      }

      send(match);

      sub.on("message", (_channel: string, message: string) => {
        send(JSON.parse(message) as MatchState);
      });

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
