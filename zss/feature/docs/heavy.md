# heavy/

**Purpose**: Heavy processing workloads — TTS engines (Piper, Supertonic), Llama 3.2 1B Instruct ONNX (WebGPU), agent with tool calls. Runs in main thread or workers; loads models on demand.

## Modules

| File | Purpose |
|------|---------|
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `model.ts` | Llama-3.2-1B-Instruct-ONNX via AutoModelForCausalLM; `modelgenerate`, `modelclassify`; uses `llm` for templates and parsing |
| `llm/` | Template and parsing library: types, `parseresult`, adapters (Llama 3.2, LFM2); `getadapter(modelId)` |
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
| `modelgenerate` | Llama 3.2 1B Instruct text generation with tool calls |
| `modelclassify` | Short classification via Llama 3.2 |
| `destroysharedmodel` | Dispose shared model (e.g. on unload) |
| `createagent` | Create agent with tool-calling support |

## Consumed By

- `zss/device/heavy.ts` — Model caller, TTS
- `zss/device/vm.ts` — Agent
