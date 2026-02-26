import { getMatch } from "@/lib/game-server/match";
import { createSubscriber } from "@/lib/redis";

export const dynamic = "force-dynamic"; //need this to avoid caching game state, would get stale state or break stream

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

  const stream = new ReadableStream({ //allows for data to be pushed over an extended period of time
    start(controller) { //controller is like a pipe
      const encoder = new TextEncoder(); //converts strings into bytes

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`)); //push bytes into stream
        } catch {
          // Stream closed
        }
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
