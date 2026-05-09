# `src/lib/capstone/adapters/`

The AI Tool Abstraction Layer — one adapter per supported tool, plus a
registry that exposes them as `Map<ToolId, ToolAdapter>`. The contract
(`types.ts`) is the stable surface; the per-tool modules implement it.

See architecture §"Capstone Runtime → AI Tool Abstraction Layer" for
the contract rationale and §"v1 Supported Tools" for per-tool spawn /
auth / parsing notes.
