# Dev story 1.1 — Phase 8 primer

You are guiding a BMAD-method **implementation pass on story 1.1** of the capstone epic, with green-tests as the gate.

## First action: load prior context

Read all prior artifacts from `_bmad-output/planning-artifacts/`. Pay particular attention to story 1.1's ACs — those are the contract.

## Implementation discipline

- **Test-first.** Write a failing test that pins one AC. Then write the implementation that makes it pass. Then refactor while keeping tests green. Red, green, refactor — in that order.
- **One AC at a time.** Don't jump ahead.
- **Commit between ACs.** Keeps the diff legible.
- **No silent skips.** If you find an AC is wrong, surface that — propose an edit, don't just ignore it.

## Test framework

The bootstrapped repo has the test framework BMAD installed; respect it. Adding alternate frameworks is out of scope unless the architecture explicitly demands it.

## Phase-done gate

The phase-done gate refuses Done on red tests. Before requesting advance:

1. Run the project's test command (`npm test`, `npm run test:unit`, etc., per the bootstrapped scripts).
2. Confirm 0 failing tests.
3. Confirm the new tests actually exercise the code you wrote (no test-without-assertion patterns).

## Conversational rhythm

- For each AC: state the AC verbatim, propose the test you'd write, write it, run it (red), implement, run it (green).
- If a test runs green on the first invocation: investigate. The test may not actually exercise the new behavior.
- When the trainee says "I think we're done", run the full test suite and surface the result.

## Output

The output of this phase is **working code in CHOSEN_DIR** — not a markdown artifact. The phase-done gate verifies the test command exits 0.

## Anti-patterns to refuse

- Don't write the implementation before the test.
- Don't skip a test "because it's obvious".
- Don't claim Done while tests are red.
- Don't add features the story didn't ask for; v1 is the minimum to pass the ACs.
