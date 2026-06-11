# heavy/

**Purpose**: Heavy processing workloads — Gemma 4 E2B agent LLM via Transformers.js (WebGPU) and board agents. Runs in **heavyspace**; models load on demand. Piper/Supertonic TTS inference moved to on-demand **ttsspace** ([`ttsworker.ts`](../../device/ttsworker.ts)); [`heavy/tts.ts`](tts.ts) remains the shared inference library.

## Agent LLM

In-browser agents use **Gemma 4 E2B instruct ONNX** only:

- Model: `onnx-community/gemma-4-E2B-it-ONNX` (`q4f16`, WebGPU)
- Stack: `Gemma4ForConditionalGeneration` + OpenAI-style **tool calling** (`run_zss_command`)
- Context: 131k tokens
- Intent gate: SmolLM2-135M classifier before full agent generation

**CLI**: `#agent model` shows model info; `#agent start` / `#agent stop` manage agents.

Function-calling reference: [Google Gemma 4 function calling](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4).

## Modules

| File | Purpose |
|------|---------|
| `heavyllmpreset.ts` | Gemma 4 E2B model id, dtype, context; legacy storage key normalization |
| `agentprompt.ts` | Testable agent tool loop (`runagentpromptloop`) |
| `prompt.ts` | `buildagentsystemprompt` for cooperative player-help behavior |
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `model.ts` | Gemma 4 generator + SmolLM2 classifier; `modelgenerategemma4`, `modelclassify` |
| `llm/` | Tool-call parsing, output cleanup; see `llm/README.md` |
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
| `modelgenerategemma4` | Gemma 4 generation with tools + tool-call parsing |
| `modelclassify` | Short intent classification (SmolLM2) |
| `runagentpromptloop` | Multi-turn tool loop for board agents |
| `destroysharedmodel` | Dispose main + classifier (e.g. last agent stopped) |
| `createagent` | Create agent device |

## Consumed By

- `zss/device/heavy.ts` — Model caller, agent prompts
- `zss/device/ttsworker.ts` — Piper/Supertonic inference (`requestinfo`, `requestaudiobytes`)
- `zss/device/register.ts` — Legacy preset storage migration on login
- `zss/firmware/cli/commands/agent.ts` — `#agent`
