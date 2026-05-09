#!/usr/bin/env node
// Deterministic stand-in for the per-tool AI CLI (claude / codex /
// copilot) used by the chat-phase PTY e2e. Receives
// [chosenDir, tool, phase] as argv (matching the fixture-mode args the
// chat PTY spawn route passes). Prints a recognizable banner that
// echoes all three so the e2e can assert the route forwarded the right
// inputs, then waits briefly and exits 0.
//
// Kept argv-shape close to the real CLIs so failures during the e2e
// are diagnosable from the rendered terminal alone.

import { stdout, exit } from "node:process";

const [chosenDir = "<missing>", tool = "<missing>", phase = "<missing>"] =
  process.argv.slice(2);

stdout.write(
  `fake-chat-pty: chosenDir=${chosenDir} tool=${tool} phase=${phase}\r\n`,
);
stdout.write("Ready.\r\n");

// Stay alive briefly so the e2e can read the buffer + close the page;
// a too-fast exit would race the terminal renderer's first paint.
setTimeout(() => exit(0), 1500);
