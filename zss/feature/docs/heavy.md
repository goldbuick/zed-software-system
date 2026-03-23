# heavy/

**Purpose**: Heavy processing workloads — TTS engines (Piper, Supertonic), configurable ONNX instruct LMs via Transformers.js (WebGPU), and board agents. Runs in a dedicated worker; models load on demand.

## Heavy LLM presets

Presets are defined in [`heavyllmpreset.ts`](../heavy/heavyllmpreset.ts): **`llama`** (Llama 3.2 3B, default), **`phi`** (Phi-3.5-mini), **`tiny`** (Llama 3.2 1B Instruct ONNX, `q4f16`). Stored or typed **`qwen`** is treated as **`tiny`** (legacy alias).

**Effective preset** (worker): value restored from register IndexedDB key **`heavy_llm_preset`** (if valid), else built-in default **`llama`** (`HEAVY_LLM_DEFAULT_PRESET` in code).

**CLI**: `#agent model` prints the effective preset plus a `!runit` hyperlink per preset (highlighted current row); `#agent model <preset>` writes storage and notifies the worker (serialized on the heavy model job queue).

## Modules

| File | Purpose |
|------|---------|
| `heavyllmpreset.ts` | Preset ids, HF repo ids, dtypes, context budgets; env + storage resolution helpers |
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `model.ts` | `AutoModelForCausalLM` main generator + SmolLM2 classifier; `modelgenerate`, `modelclassify`, `applyheavylmpreset` |
| `llm/` | Output cleanup (`parseresult`); adapter notes in `llm/README.md` |
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
| `modelgenerate` | Instruct LM text generation for agents |
| `modelclassify` | Short intent classification (SmolLM2) |
| `destroysharedmodel` | Dispose main + classifier (e.g. last agent stopped) |
| `applyheavylmpreset` | Set preset in worker and drop main generator session |
| `createagent` | Create agent device |

## Consumed By

- `zss/device/heavy.ts` — Model caller, TTS, `heavy:llmpreset`
- `zss/device/register.ts` — Restore persisted preset after login
- `zss/firmware/cli/commands/agent.ts` — `#agent model`
