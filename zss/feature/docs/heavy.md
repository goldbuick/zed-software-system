# heavy/

**Purpose**: Heavy processing workloads — TTS engines (Piper, Supertonic), configurable ONNX instruct LMs via Transformers.js (WebGPU), and board agents. Runs in a dedicated worker; models load on demand.

## Heavy LLM presets

Presets are defined in [`heavyllmpreset.ts`](../heavy/heavyllmpreset.ts): **`llama`** (Llama 3.2 3B, default) and **`tiny`** (Llama 3.2 1B Instruct, `q4f16`) use the causal LM stack; **`gemma`** loads Gemma 4 E2B instruct ONNX (`Gemma4ForConditionalGeneration` + tool calling). Stored **`qwen`** is treated as **`tiny`** (legacy alias); older stored values such as **`phi`** / **`smol`** fall back to **`llama`**.

**Effective preset** (worker): value restored from register IndexedDB key **`heavy_llm_preset`** (if valid), else built-in default **`llama`** (`HEAVY_LLM_DEFAULT_PRESET` in code).

**CLI**: `#agent model` prints the effective preset plus a `!runit` hyperlink per preset (highlighted current row); `#agent model <preset>` writes storage and notifies the worker (serialized on the heavy model job queue).

## Modules

| File | Purpose |
|------|---------|
| `heavyllmpreset.ts` | Preset ids, HF repo ids, dtypes, context budgets, backend (`causal_lm` \| `gemma4`); storage resolution helpers |
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `model.ts` | Causal LM + Gemma 4 generator paths + SmolLM2 classifier; `modelgenerate`, `modelgenerategemma4`, `modelclassify`, `applyheavylmpreset` |
| `llm/` | Output cleanup (`parseresult`), Gemma tool schemas + JSON parse; see `llm/README.md` |
| `agent.ts` | Agent device; `createagent`, `AGENT` |
| `modelcache.ts` | Piper fetch helper — Cache Storage API (`zss-heavy-models`) + per-URL singleflight |
| `utils.ts` | `RawAudio`, `TextSplitterStream`, `normalizePeak`, `trimSilence`, `detectWebGPU` |
| `textcleaner.ts` | `cleanTextForTTS`, `chunkText` |
| `formatstate.ts` | Board text for agents; `AGENT_ZSS_COMMANDS` |
| `phonemizerparser.ts` | Phonemize text (JavaScript) |

## Exports (main)

| Function | Description |
|----------|-------------|
| `requestinfo` | TTS engine info (voices) |
| `requestaudiobytes` | Generate audio bytes from Piper/Supertonic |
| `modelgenerate` | Causal LM text generation for agents (`llama` / `tiny`) |
| `modelgenerategemma4` | Gemma preset: templated generation with tools + tool-call parsing |
| `modelclassify` | Short intent classification (SmolLM2) |
| `destroysharedmodel` | Dispose main + classifier (e.g. last agent stopped) |
| `applyheavylmpreset` | Set preset in worker and drop main generator session |
| `createagent` | Create agent device |

## Consumed By

- `zss/device/heavy.ts` — Model caller, TTS, `heavy:llmpreset`
- `zss/device/register.ts` — Restore persisted preset after login
- `zss/firmware/cli/commands/agent.ts` — `#agent model`
