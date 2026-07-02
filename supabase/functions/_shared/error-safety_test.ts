// Integration tests: verify that flashcards, study-chat and transcribe
// edge functions handle error paths safely and never leak sensitive
// implementation details (internal error messages, provider names,
// stack traces, HTTP status codes, env var names, etc.) to the client.
//
// The tests hit the DEPLOYED edge functions over HTTPS. They only exercise
// paths that don't require a valid user session (missing / invalid JWT,
// malformed bodies), which are exactly the paths where verbose errors
// have historically leaked.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";

if (!SUPABASE_URL || !ANON_KEY) {
  console.warn(
    "Skipping error-safety tests: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set in .env",
  );
}

// Forbidden substrings that MUST NEVER appear in a client error response.
// Case-insensitive check.
const FORBIDDEN_LEAKS: string[] = [
  "groq",                       // AI provider name
  "openai",                     // AI provider name
  "lovable_api_key",            // secret name
  "supabase_service_role",      // secret name
  "service_role_key",           // secret name
  "ai gateway error",           // internal error phrasing (verbose_error_logs finding)
  "ai api error",               // internal error phrasing
  "api.groq.com",               // internal endpoint
  "ai.gateway.lovable.dev",     // internal endpoint
  "stack trace",
  "at deno",
  "at file://",
  "typeerror",
  "syntaxerror",
  "referenceerror",
  "undefined is not",
  "cannot read propert",
  "eyj",                        // JWT prefix (base64 header of a JWT starts with eyJ)
];

const assertNoLeak = (label: string, body: string) => {
  const lower = body.toLowerCase();
  for (const needle of FORBIDDEN_LEAKS) {
    assert(
      !lower.includes(needle),
      `[${label}] response leaked forbidden substring "${needle}": ${body}`,
    );
  }
  // Response must not include a bare HTTP status code we bubbled up
  // (e.g. "500", "429" as the whole/leading error message with a colon after).
  assert(
    !/error.*:\s*(4\d\d|5\d\d)\b/i.test(body),
    `[${label}] response leaked a raw HTTP status: ${body}`,
  );
};

const callFn = async (
  name: string,
  opts: { auth?: string; body?: unknown; contentType?: string } = {},
) => {
  const headers: Record<string, string> = {
    "Content-Type": opts.contentType ?? "application/json",
    apikey: ANON_KEY,
  };
  if (opts.auth !== undefined) headers.Authorization = opts.auth;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: opts.body === undefined ? undefined : (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)),
  });
  const text = await res.text();
  return { status: res.status, text };
};

const skipIfNoEnv = () => !SUPABASE_URL || !ANON_KEY;

// ---------------- generate-flashcards ----------------

Deno.test("generate-flashcards: missing auth returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("generate-flashcards", {
    body: { type: "text", content: "Test", count: 1 },
  });
  assertEquals(status, 401);
  const lower = text.toLowerCase();
  assert(
    lower.includes("non autoris") || lower.includes("missing authorization"),
    `expected a generic auth error, got: ${text}`,
  );
  assertNoLeak("generate-flashcards/no-auth", text);
});

Deno.test("generate-flashcards: bogus JWT returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("generate-flashcards", {
    auth: "Bearer not-a-real-jwt-just-garbage",
    body: { type: "text", content: "Test", count: 1 },
  });
  assertEquals(status, 401);
  assertNoLeak("generate-flashcards/bad-jwt", text);
});

// ---------------- ai-study-chat ----------------

Deno.test("ai-study-chat: missing auth returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("ai-study-chat", {
    body: { message: "Bonjour" },
  });
  assertEquals(status, 401);
  const lower = text.toLowerCase();
  assert(
    lower.includes("non autoris") || lower.includes("missing authorization"),
    `expected a generic auth error, got: ${text}`,
  );
  assertNoLeak("ai-study-chat/no-auth", text);
});

Deno.test("ai-study-chat: bogus JWT returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("ai-study-chat", {
    auth: "Bearer clearly.invalid.token",
    body: { message: "Bonjour" },
  });
  assertEquals(status, 401);
  assertNoLeak("ai-study-chat/bad-jwt", text);
});

// ---------------- transcribe-and-enhance ----------------

Deno.test("transcribe-and-enhance: missing auth returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("transcribe-and-enhance", {
    body: { transcript: "Hello", subject: "Math" },
  });
  assertEquals(status, 401);
  const lower = text.toLowerCase();
  assert(
    lower.includes("non autoris") || lower.includes("missing authorization"),
    `expected a generic auth error, got: ${text}`,
  );
  assertNoLeak("transcribe-and-enhance/no-auth", text);
});

Deno.test("transcribe-and-enhance: bogus JWT returns generic 401 without leaks", async () => {
  if (skipIfNoEnv()) return;
  const { status, text } = await callFn("transcribe-and-enhance", {
    auth: "Bearer garbage.jwt.value",
    body: { transcript: "Hello" },
  });
  assertEquals(status, 401);
  assertNoLeak("transcribe-and-enhance/bad-jwt", text);
});

// ---------------- Static source-code assertions ----------------
// Guard against regressions: the three functions must not construct
// client-facing error messages that echo the AI provider or an HTTP status.

const FORBIDDEN_IN_CLIENT_RESPONSES: RegExp[] = [
  // `JSON.stringify({ error: ... })` payloads that interpolate AI gateway status
  /JSON\.stringify\(\{\s*error:\s*[`"'][^`"']*(?:AI gateway error|AI API error)[^`"']*\$\{[^}]*status[^}]*\}/i,
];

const readFn = async (name: string) => {
  const url = new URL(`../${name}/index.ts`, import.meta.url);
  return await Deno.readTextFile(url);
};

Deno.test("source: generate-flashcards does not stringify AI gateway status back to client", async () => {
  const src = await readFn("generate-flashcards");
  for (const rx of FORBIDDEN_IN_CLIENT_RESPONSES) {
    assert(!rx.test(src), `generate-flashcards source matches forbidden pattern ${rx}`);
  }
});

Deno.test("source: ai-study-chat does not stringify AI gateway status back to client", async () => {
  const src = await readFn("ai-study-chat");
  for (const rx of FORBIDDEN_IN_CLIENT_RESPONSES) {
    assert(!rx.test(src), `ai-study-chat source matches forbidden pattern ${rx}`);
  }
});

Deno.test("source: transcribe-and-enhance does not stringify AI gateway status back to client", async () => {
  const src = await readFn("transcribe-and-enhance");
  for (const rx of FORBIDDEN_IN_CLIENT_RESPONSES) {
    assert(!rx.test(src), `transcribe-and-enhance source matches forbidden pattern ${rx}`);
  }
});
