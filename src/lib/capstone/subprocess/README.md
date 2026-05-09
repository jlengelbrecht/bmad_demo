# `src/lib/capstone/subprocess/`

The `runStreaming(opts): AsyncIterable<ProcEvent>` primitive and the
`tracked-children` registry that backs it. Centralizes all seven NFR-S4
non-negotiables in one place; every chat / bootstrap / adapter call site
consumes this module instead of re-implementing pipe-draining, signal
handling, and lifecycle bookkeeping.

See architecture §"Capstone Runtime → Subprocess Discipline" for the
seven invariants and the rationale for each.
