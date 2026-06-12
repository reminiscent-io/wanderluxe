export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1,
  delayMs = 1000,
): Promise<T> {
  const attempts = Math.max(0, retries) + 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        console.warn(
          `[evals] attempt ${attempt}/${attempts} failed, retrying: ${err instanceof Error ? err.message : String(err)}`,
        );
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
  }
  throw lastError;
}
