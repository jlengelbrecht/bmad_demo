"use client";

import { useReducer, useRef, useState } from "react";

import type { ChatStreamEvent } from "@/lib/capstone/adapters/types";

type ChatMessage =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; complete: boolean }
  | { kind: "tool-call"; description: string }
  | { kind: "error"; message: string };

type ChatState = {
  messages: ChatMessage[];
  toolSessionId: string | null;
  inFlight: boolean;
};

type ChatAction =
  | { type: "USER_SUBMIT"; text: string }
  | { type: "STREAM_OPEN" }
  | { type: "STREAM_EVENT"; ev: ChatStreamEvent }
  | { type: "STREAM_DONE" }
  | { type: "CANCELLED" };

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "USER_SUBMIT":
      return {
        ...state,
        messages: [...state.messages, { kind: "user", text: action.text }],
        inFlight: true,
      };
    case "STREAM_OPEN":
      return state;
    case "STREAM_EVENT": {
      const ev = action.ev;
      if (ev.kind === "session-init") {
        return { ...state, toolSessionId: ev.sessionId };
      }
      if (ev.kind === "message-delta") {
        const last = state.messages[state.messages.length - 1];
        if (last?.kind === "assistant" && !last.complete) {
          const updated = { ...last, text: last.text + ev.text };
          return {
            ...state,
            messages: [...state.messages.slice(0, -1), updated],
          };
        }
        return {
          ...state,
          messages: [
            ...state.messages,
            { kind: "assistant", text: ev.text, complete: false },
          ],
        };
      }
      if (ev.kind === "tool-call") {
        return {
          ...state,
          messages: [
            ...state.messages,
            { kind: "tool-call", description: ev.description },
          ],
        };
      }
      if (ev.kind === "message-end") {
        const last = state.messages[state.messages.length - 1];
        if (last?.kind === "assistant") {
          const updated = { ...last, complete: true };
          return {
            ...state,
            messages: [...state.messages.slice(0, -1), updated],
          };
        }
        return state;
      }
      if (ev.kind === "error") {
        return {
          ...state,
          messages: [...state.messages, { kind: "error", message: ev.message }],
        };
      }
      return state;
    }
    case "STREAM_DONE":
      return { ...state, inFlight: false };
    case "CANCELLED":
      return { ...state, inFlight: false };
    default:
      return state;
  }
}

export function ChatThread({
  sessionId: _sessionId,
  phase,
  tool,
  chosenDir,
}: {
  sessionId: string;
  phase: string;
  tool: string;
  chosenDir: string;
}) {
  void _sessionId;
  const [state, dispatch] = useReducer(reducer, {
    messages: [],
    toolSessionId: null,
    inFlight: false,
  });
  const [input, setInput] = useState("");
  const esRef = useRef<EventSource | null>(null);

  const submit = () => {
    if (state.inFlight) return;
    if (!input.trim()) return;
    dispatch({ type: "USER_SUBMIT", text: input });
    const turnSessionId = state.toolSessionId ?? "new";
    const qs = new URLSearchParams({
      phase,
      message: input,
      tool,
      chosenDir,
    }).toString();
    const url = `/api/capstone/chat/${turnSessionId}/stream?${qs}`;
    const es = new EventSource(url);
    esRef.current = es;
    dispatch({ type: "STREAM_OPEN" });

    es.addEventListener("msg", (e) => {
      try {
        const ev = JSON.parse((e as MessageEvent).data) as ChatStreamEvent;
        dispatch({ type: "STREAM_EVENT", ev });
      } catch {
        // ignore
      }
    });
    es.addEventListener("done", () => {
      dispatch({ type: "STREAM_DONE" });
      es.close();
      esRef.current = null;
    });
    es.addEventListener("error", () => {
      // Browser-level error event (no data); only fires for connection problems.
      // Server-side terminal errors come via 'msg' with kind:'error'.
    });
    setInput("");
  };

  const cancel = () => {
    esRef.current?.close();
    esRef.current = null;
    dispatch({ type: "CANCELLED" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        {state.messages.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-500">
            No messages yet. Type your first question below.
          </p>
        ) : null}
        {state.messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {state.inFlight ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">▶ streaming…</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="Type a message — Cmd/Ctrl+Enter to submit."
          className="w-full resize-y rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Don&apos;t like the answer? Type a follow-up.
          </p>
          <div className="flex gap-2">
            {state.inFlight ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={state.inFlight || !input.trim() || input.length > 32_000}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Submit
            </button>
          </div>
        </div>
        {input.length > 8000 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Message is unusually long ({input.length} chars). Hard cap at 32,000.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.kind === "user") {
    return (
      <p className="self-end max-w-[80%] rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
        {message.text}
      </p>
    );
  }
  if (message.kind === "assistant") {
    return (
      <div className="max-w-[90%] whitespace-pre-wrap rounded-lg bg-zinc-100 px-3 py-1.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
        {message.text}
      </div>
    );
  }
  if (message.kind === "tool-call") {
    return (
      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {message.description}
      </p>
    );
  }
  return (
    <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
      ⚠ {message.message}
    </p>
  );
}
