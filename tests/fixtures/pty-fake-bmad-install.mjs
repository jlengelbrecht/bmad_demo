#!/usr/bin/env node
// Deterministic stand-in for `npx bmad-method install` used by the
// PTY e2e spec. Receives [chosenDir, tool] as argv (matching the
// fixture-mode args the PTY route passes), prompts "Continue? (y/n)"
// on stdout, reads one byte from stdin.
//   - "y" / "Y" → prints "Installing..." then exits 0
//   - any other → exits 1
//
// Kept argv-shape close to the real install so failures during the
// e2e are diagnosable from logs alone.

import { stdin, stdout, exit } from "node:process";

const [chosenDir = "<missing>", tool = "<missing>"] = process.argv.slice(2);

stdout.write(`fake-bmad-install: target=${chosenDir} tool=${tool}\r\n`);
stdout.write("Continue? (y/n) ");

stdin.setRawMode?.(true);
stdin.resume();
stdin.once("data", (buf) => {
  const ch = buf.toString("utf8").charAt(0).toLowerCase();
  stdout.write(ch + "\r\n");
  if (ch === "y") {
    stdout.write("Installing...\r\n");
    stdout.write("Done.\r\n");
    exit(0);
  } else {
    stdout.write("Cancelled.\r\n");
    exit(1);
  }
});
