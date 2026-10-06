export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// What went wrong, without anything people wrote: a parse error quotes the text it
// choked on, and a failed query lists its parameters. Errors from the AI provider's
// API (they have a status) only describe the request, so their message is kept.
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return `${error.name}: ${error.message}`;
  // A network or database code (ECONNREFUSED, 53100...) says why without saying what
  let cause: unknown = error;
  for (let depth = 0; depth < 4 && cause instanceof Error; depth++, cause = cause.cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === "string") return `${error.name} (${code})`;
  }
  return error.name;
}
