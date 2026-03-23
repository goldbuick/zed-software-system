# LLM template and parsing library

Shared types and **output cleanup** for heavy ONNX instruct models. The active generator is chosen by preset in [`heavyllmpreset.ts`](../heavyllmpreset.ts) and loaded in [`model.ts`](../model.ts) (Transformers.js `AutoModelForCausalLM`).

## Structure

- **types.ts** — `MODEL_RESULT`, `PARSE_OPTIONS`, etc.
- **parse.ts** — `parseresult(raw, options?)` strips `think` blocks and `<|special|>` tokens from raw decoder output.

## Configuration

- **Presets**: `llama` \| `phi` \| `tiny` → Hugging Face ONNX repos in [`heavyllmpreset.ts`](../heavyllmpreset.ts) (all use `q4f16` here). Legacy id **`qwen`** normalizes to **`tiny`**.
- **Persistence**: register storage key `heavy_llm_preset`; `#agent model <preset>` updates storage and the worker. Default when unset: `HEAVY_LLM_DEFAULT_PRESET` in `heavyllmpreset.ts`.

## Adapters folder

The `adapters/` directory documents alternate chat/tool templates for various families (Llama 3.2, Qwen2.5, SmolLM2, etc.). The current `model.ts` path uses each tokenizer’s `apply_chat_template` when available, with a ChatML fallback.

## Usage (from model.ts / heavy.ts)

- **model.ts**: `apply_chat_template` + `model.generate` + `parseresult` for agent replies.
- **heavy.ts**: Builds system prompt and message history; runs classification then generation on the model job queue.
