import * as ptyRegistry from "@/lib/capstone/pty/session-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts either a bare session id (`20260509T120000Z`, used by the
// bootstrap PTY) or a session.phase id (`20260509T120000Z.brief`,
// used by the chat-phase PTY) so the same generic route serves both.
const PTY_ID_RE = /^\d{8}T\d{6}Z(\.[a-z0-9.-]+)?$/;

/**
 * SSE stream of PTY output. Two event types:
 *   - `data`  — base64-encoded chunk of raw PTY output (UTF-8;
 *               xterm.js in the browser decodes via TextDecoder).
 *   - `exit`  — `{exitCode, signal}` when the PTY terminates. Final
 *               event before the stream closes.
 *
 * If a session is already exited at GET time, fires one `exit` event
 * immediately and closes — used by the client to recover from a tab
 * reload mid-PTY.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ ptyId: string }> },
): Promise<Response> {
  const { ptyId } = await ctx.params;
  if (!PTY_ID_RE.test(ptyId)) {
    return Response.json(
      { ok: false, error: "Invalid ptyId" },
      { status: 400 },
    );
  }
  const session = ptyRegistry.get(ptyId);
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
      // emitted between PTY spawn and SSE attach aren't lost.
      // UTF-8 encoding is REQUIRED — node-pty emits multi-byte
      // codepoints for the AI tools' TUI glyphs.
      if (session.outputBuffer.length > 0) {
        const b64 = Buffer.from(session.outputBuffer, "utf8").toString(
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

      const dataDispose = session.pty.onData((chunk) => {
        const b64 = Buffer.from(chunk, "utf8").toString("base64");
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
