# LLM template and parsing library

Abstraction for interacting with different chat/tool-calling models (Llama 3.2, LFM2, etc.) via a single interface.

## Structure

- **types.ts** — Shared types: `TOOL_CALL`, `MODEL_RESULT`, `TOOL_DEF`, `TEMPLATE_TOOL`, `PARSE_OPTIONS`, `LLM_ADAPTER`, `MESSAGE_WITH_TOOL_CALLS`.
- **parse.ts** — Parse raw model output: `parseresult(raw, options?)` returns `{ text, toolcalls, raw }`. Supports XML `<tool_call>`, JSON object (top-level or nested e.g. `tool_call`), JSON array, and Pythonic `name(args)`. Options: `jsonNestedToolCallKey` for SmolLM2-style `{"tool_call": {"name", "arguments"}}`. Helpers: `normalizetoolarg`, `parsepythonicargs`.
- **adapters/** — Per-model adapters implementing `LLM_ADAPTER`:
  - **llama32.ts** — Llama 3.2 1B Instruct ONNX: tools in system block, JSON `name`/`parameters`, one assistant message per tool call in history.
  - **lfm2.ts** — LFM2 (700M ONNX, 24B, LiquidAI): Pythonic or JSON output, single assistant message.
  - **smollm2.ts** — SmolLM2 (360M ONNX, Instruct, function_calling): JSON `name`/`arguments` or nested `tool_call`; single assistant message.
  - **qwen25.ts** — Qwen2.5 Instruct (e.g. 0.5B ONNX): JSON `name`/`arguments`; single assistant message.
- **adapters/index.ts** — `getadapter(modelId)` returns the adapter for a given model ID, or `undefined`.

## Adding a new model

1. Add a new adapter in `adapters/` implementing `LLM_ADAPTER`: `modelids`, `toolsfortemplate`, `getchattemplateoptions`, `parseoptions`, `buildassistanttoolcallmessages`.
2. Register it in `adapters/index.ts` by pushing to the `ADAPTERS` array.
3. Use `MODEL_ID` in `model.ts` (or pass the model id when loading); `modelgenerate` and history building in `heavy.ts` will use the adapter automatically.

## Usage (from model.ts / heavy.ts)

- **model.ts**: `getadapter(MODEL_ID)` → template options for `apply_chat_template`, parse options for `parseresult`.
- **heavy.ts**: `getadapter(MODEL_ID).buildassistanttoolcallmessages(toolcalls, raw)` → messages to append to history after a tool-calling turn.
