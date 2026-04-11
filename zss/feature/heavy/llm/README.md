# LLM template and parsing library

Shared types and **output cleanup** for heavy ONNX models. The active generator is chosen by preset in [`heavyllmpreset.ts`](../heavyllmpreset.ts) and loaded in [`model.ts`](../model.ts) (Transformers.js).

## Backends

| Preset   | Stack | Agent actions |
|----------|--------|----------------|
| `llama`, `tiny` | `AutoTokenizer` + `AutoModelForCausalLM` | Model emits `#` / `!` lines; [`heavy.ts`](../../../device/heavy.ts) parses lines and runs CLI |
| `gemma`   | `AutoProcessor` + `Gemma4ForConditionalGeneration` | `apply_chat_template` with OpenAI-style **tools**; JSON tool calls parsed by [`parsetoolcalls.ts`](./parsetoolcalls.ts), then same `runcli` execution path |

Intent classification still uses SmolLM2-135M (`modelclassify`) for all presets.

## Structure

- **types.ts** — `MODEL_RESULT`, `PARSE_OPTIONS`, etc.
- **parse.ts** — `parseresult(raw, options?)` strips `think` blocks and `<|special|>` tokens (used for causal LM output and for Gemma **speech-only** turns after tool JSON is ruled out).
- **agenttools.ts** — `heavyagenttoolschemas()` for Gemma chat templating (`run_zss_command` + `line`).
- **parsetoolcalls.ts** — `parsetoolcallsfromassistant`, `validatedzsslinetoolcalls`.

## Configuration

- **Presets**: `llama` \| `tiny` \| `gemma` in [`heavyllmpreset.ts`](../heavyllmpreset.ts) (`q4f16`, WebGPU). Legacy id **`qwen`** normalizes to **`tiny`**; unknown ids fall back to **`llama`** when read from storage.
- **Persistence**: register storage key `heavy_llm_preset`; `#agent model <preset>` updates storage and the worker. Default when unset: `HEAVY_LLM_DEFAULT_PRESET` in `heavyllmpreset.ts`.

## Usage (from model.ts / heavy.ts)

- **model.ts**: Causal path — tokenizer `apply_chat_template` + `generate` + `parseresult`. Gemma path — processor template with `tools`, `generate`, then tool-call parse vs speech cleanup.
- **heavy.ts**: Builds system prompt (`buildsystemprompt` vs `buildsystempromptgemma`); runs classification then generation on the model job queue; Gemma turns append `role: tool` results for multi-step tool use.
