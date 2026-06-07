# LLM template and parsing library

Shared types and **output cleanup** for heavy ONNX models. Agents use **Gemma 4 E2B** only, loaded in [`model.ts`](../model.ts) (Transformers.js).

## Backend

| Stack | Agent actions |
|-------|----------------|
| `AutoProcessor` + `Gemma4ForConditionalGeneration` | `apply_chat_template` with OpenAI-style **tools**; tool calls parsed by [`parsetoolcalls.ts`](./parsetoolcalls.ts), then executed via `runcli` in [`heavy.ts`](../../../device/heavy.ts) |

Intent classification uses SmolLM2-135M (`modelclassify`) before the agent LLM runs.

## Tool-call parsing

Gemma 4 may emit tool calls in two formats (both handled by `parsetoolcallsfromassistant`):

1. **Native tokens** (Google wire format):

   ```
   <|tool_call>call:run_zss_command{line:<|"|>#userinput up<|"|>}<tool_call|>
   ```

   Parsed by `extractgemmanativetoolcalls` using Google's regex pattern.

2. **JSON fallback** — `{ "name": "run_zss_command", "arguments": { "line": "#query" } }` (bare object, array, or fenced block).

Validated CLI lines must start with `#` or `!` (`validatedzsslinetoolcalls`).

Tests: [`__tests__/parsetoolcalls.test.ts`](./__tests__/parsetoolcalls.test.ts), [`../__tests__/agenttoolloop.test.ts`](../__tests__/agenttoolloop.test.ts), [`../__tests__/agenthelpscenarios.test.ts`](../__tests__/agenthelpscenarios.test.ts).

## Structure

- **types.ts** — `MODEL_RESULT`, `PARSE_OPTIONS`, etc.
- **parse.ts** — `parseresult(raw, options?)` strips `think` blocks and special tokens (speech-only turns after tool JSON is ruled out).
- **agenttools.ts** — `heavyagenttoolschemas()` for Gemma chat templating (`run_zss_command` + `line`).
- **parsetoolcalls.ts** — `extractgemmanativetoolcalls`, `parsetoolcallsfromassistant`, `validatedzsslinetoolcalls`.

## Usage

- **model.ts**: Processor template with `tools`, `generate`, native/JSON tool-call parse vs speech cleanup.
- **agentprompt.ts**: Builds system prompt, runs multi-turn loop; appends `role: tool` results for `#continue` steps.
- **heavy.ts**: Classifies chat intent, wires `runagentpromptloop` to vmquery `runcli`.

## External reference

- [Function calling with Gemma 4](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)
