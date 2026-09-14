// Vitest-only stand-in for the `server-only` package.
//
// The real package unconditionally throws when required outside of Next.js's
// bundler (which swaps it for an empty module in server contexts via package
// exports conditions). Vitest runs modules under plain Node, so importing it
// directly would throw during otherwise-valid unit tests. This stub is
// aliased in vitest.config.ts ONLY -- the production Next.js build still
// uses the real package and its real guard.
export {};
