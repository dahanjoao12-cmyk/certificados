// Loads .env.local into process.env before any test file's imports run --
// Vitest, unlike Next.js, does not do this automatically.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine if it's missing; the tests themselves will fail loudly with a
  // clear "env var not configured" error instead of a confusing one.
}
