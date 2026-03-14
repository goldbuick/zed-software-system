# heavy/

**Purpose**: Heavy processing workloads — TTS engines (Piper, Supertonic), Qwen2.5-1.5B LLM (ONNX/WebGPU), agent with tool calls. Runs in main thread or workers; loads models on demand.

## Modules

| File | Purpose |
|------|---------|
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `model.ts` | Qwen2.5-1.5B-Instruct ONNX via AutoModelForCausalLM; `modelgenerate`, `modelclassify`, `parseresult` (XML/JSON + Pythonic fallback) |
| `agent.ts` | Agent with tool-calling; `createagent`, `AGENT` |
| `modelcache.ts` | ModelCache — fetch/cache for model files |
| `utils.ts` | `RawAudio`, `TextSplitterStream`, `normalizePeak`, `trimSilence`, `detectWebGPU` |
| `textcleaner.ts` | `cleanTextForTTS`, `chunkText` |
| `formatstate.ts` | `formatsystemprompt` for agent |
| `phonemizerparser.ts` | Phonemize text (JavaScript) |

## Exports (main)

| Function | Description |
|----------|-------------|
| `requestinfo` | TTS engine info (voices) |
| `requestaudiobytes` | Generate audio bytes from Piper/Supertonic |
| `modelgenerate` | Qwen2.5-1.5B-Instruct text generation with tool calls |
| `modelclassify` | Short classification via Qwen2.5 |
| `destroysharedmodel` | Dispose shared model (e.g. on unload) |
| `createagent` | Create agent with tool-calling support |

## Consumed By

- `zss/device/heavy.ts` — Model caller, TTS
- `zss/device/vm.ts` — Agent
