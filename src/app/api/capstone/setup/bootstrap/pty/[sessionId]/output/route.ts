import * as ptyRegistry from "@/lib/capstone/pty/session-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE stream of PTY output. Two event types:
 *   - `data`  — base64-encoded chunk of raw PTY output (may include
 *               ANSI escape sequences and non-printable bytes; xterm.js
 *               in the browser decodes + writes verbatim).
 *   - `exit`  — `{exitCode, signal}` when the PTY terminates. Final
 *               event before the stream closes.
 *
 * If a session is already exited at GET time, we fire one `exit` event
 * immediately and close — used by the client to recover from a tab
 * reload mid-bootstrap.
 *
 * If a session does not exist, returns 404.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params;
  if (!/^\d{8}T\d{6}Z$/.test(sessionId)) {
    return Response.json(
      { ok: false, error: "Invalid sessionId" },
      { status: 400 },
    );
  }
  const session = ptyRegistry.get(sessionId);
  if (!session) {
    return Response.json(
      { ok: false, error: "No PTY session for that id" },
      { status: 404 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (event: string, data: unknown) => {
        const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          // Controller closed; nothing to do.
        }
      };

      // Replay the buffered output before subscribing so chunks
      // emitted between PTY spawn and SSE attach aren't lost. This is
      // load-bearing for fixtures that print immediately on start.
      if (session.outputBuffer.length > 0) {
        const b64 = Buffer.from(session.outputBuffer, "binary").toString(
          "base64",
        );
        enqueue("data", { b64 });
      }

      // If already exited, fire exit + close.
      if (session.exitCode !== null) {
        enqueue("exit", {
          exitCode: session.exitCode,
          signal: session.exitSignal,
        });
        controller.close();
        return;
      }

      // Live PTY: subscribe.
      const dataDispose = session.pty.onData((chunk) => {
        // Base64 so escape sequences + non-printable bytes survive SSE.
        // node-pty's onData yields a string but it's the raw byte
        // sequence as-is; encode via Buffer to preserve bytes.
        const b64 = Buffer.from(chunk, "binary").toString("base64");
        enqueue("data", { b64 });
      });
      const exitDispose = session.pty.onExit(({ exitCode, signal }) => {
        enqueue("exit", { exitCode, signal: signal ?? null });
        dataDispose.dispose();
        exitDispose.dispose();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      // Tab-close → unsubscribe (don't kill the PTY; the bootstrap
      // continues running and the trainee can reload to reattach).
      req.signal.addEventListener(
        "abort",
        () => {
          dataDispose.dispose();
          exitDispose.dispose();
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
