# Universal Provider Hub

Built-in adapters cover OpenRouter/OpenAI-compatible Chat Completions, OpenAI
Responses, Anthropic Messages, Gemini generateContent, Ollama local, and
browser-local deterministic tools. Each adapter owns its request shape, auth
header, catalog source, capabilities, privacy note, health, and error state.

Keys are encrypted locally. Saving proves vault round-trip only; a separate
authentication-only model-catalog request must succeed before a paid provider
becomes healthy. Paid generation is never triggered by the connection test.
Catalog failures retain the last known good list and show degraded status.

Custom endpoints require HTTPS unless explicitly local, reject embedded
credentials/private cloud targets, strip unsafe forwarded headers, and remain
untrusted until tested.
