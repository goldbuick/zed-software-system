# heavy/

**Purpose**: Heavy processing workloads — TTS engines (Piper, Kitten), transformers models, agent with tool calls. Runs in main thread or workers; loads models on demand.

## Modules

| File | Purpose |
|------|---------|
| `tts.ts` | Piper/Kitten TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `kittentts.ts` | KittenTTS class — Transformers.js TTS |
| `model.ts` | AutoModelForCausalLM/Seq2SeqLM loading; `createmodelcaller`, `parsetoolcalls` |
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
| `requestaudiobytes` | Generate audio bytes from Piper/Kitten |
| `createmodelcaller` | Create model caller for LLM inference |
| `createagent` | Create agent with tool-calling support |
| `parsetoolcalls` | Parse tool calls from model output |

## Consumed By

- `zss/device/heavy.ts` — Model caller, TTS
- `zss/device/vm.ts` — Agent
