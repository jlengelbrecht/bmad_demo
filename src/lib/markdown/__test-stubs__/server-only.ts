// Vitest-only no-op stub for the `server-only` package. Production imports
// (Next.js dev/build) use the real package, which throws if a client module
// imports a server-only module. Unit tests run in node, so the guard is moot.
export {};
