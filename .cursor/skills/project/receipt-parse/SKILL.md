# receipt-parse

Use this skill when sending receipt or PDF files to OpenAI for the first parse pass.

## Rules

- Only parse the current attached file.
- Return JSON only.
- Do not reuse prior uploads, prior parse responses, or cached examples.
- Keep ambiguous values in warnings instead of inventing bookkeeping facts.
- Treat the response as raw evidence, not final accounting truth.
