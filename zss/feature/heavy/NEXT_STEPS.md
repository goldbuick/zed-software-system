# Agent + LLM Next Steps

Summary of agent integration, feeding acklook to an LLM, and local in-browser ONNX options. Co-located with `agent.ts`, `formatacklook.ts`, and `llmagent.ts`.

---

## 1. Agent API (already in place)

- **`agent.cli(input)`** — Send a CLI command to the game (e.g. `"n"`, `"take torch"`, `"#help"`). Uses `vmcli(device, pid, input)`.
- **`agent.look(callback?)`** — Request current game view; VM replies with `acklook`. If `callback` is provided, it’s called with `ACKLOOK_DATA` (board, scroll, scrollname, sidebar, tickers).
- **`agent.id()`** / **`agent.stop()`** — Player id and teardown.

**Loop:** `agent.look(data => { … })` → use `data` → `agent.cli(cmd)` → optionally call `look` again.

---

## 2. Feeding acklook to an LLM

### Serialize for prompts

- **`formatacklookfortext(data)`** (`formatacklook.ts`) — Turns `ACKLOOK_DATA` into plain text: board grid, scroll content (color codes stripped), sidebar, tickers. Use this as the LLM user message.

### One-shot: look → LLM → cli

- **`runllmonce(agent, callllm, systemPrompt?)`** (`llmagent.ts`) — Requests look, formats with `formatacklookfortext`, calls `callllm(systemPrompt, userContent)`, then `agent.cli(firstLineOfReply)`.
- **`createopenailikecaller(url, getHeaders?)`** — Builds an `LLMCALLER` for OpenAI-style chat APIs (e.g. OpenAI, local proxy). Pass your API URL and optional `Authorization` via `getHeaders`.

### Custom LLM

Implement `LLMCALLER` yourself:

```ts
type LLMCALLER = (systemPrompt: string, userContent: string) => Promise<string>
```

Example: call Anthropic, local server, or any API; return the raw reply string. `runllmonce` will trim and use the first line as the CLI command.

### Loop

Call `runllmonce` once per step. To run continuously, schedule the next step after each one (e.g. `setTimeout(step, 2000)`).

---

## 3. Local in-browser ONNX (Hugging Face)

For running a model **in the browser** with no server, use one of these ONNX setups.

### Option A: Phi-3 (best quality, ~2GB)

- **Model:** [`microsoft/Phi-3-mini-4k-instruct-onnx-web`](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-onnx-web)
- **Runtime:** **ONNX Runtime Web** (not Transformers.js). WebGPU recommended.
- **Use when:** You want the strongest in-browser “game → command” model and can afford ~2GB + WebGPU (Chrome 113+, Edge 113+).
- **How:** Adapt the official sample: [onnxruntime-inference-examples / js/chat](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/chat). Feed it `formatacklookfortext(acklook)` + a system prompt; treat the first line of the generated reply as the CLI command and call `agent.cli(...)`.

### Option B: SmolLM2 + onnxruntime-web (implemented)

- **Model:** `HuggingFaceTB/SmolLM2-1.7B-Instruct` ONNX (`model_q4` / `model_q4f16` from HuggingFace).
- **Runtime:** **ONNX Runtime Web** + **@huggingface/transformers** (tokenizer only). See `smollm2onnx.ts`.
- **Use when:** You want in-browser SmolLM2 with WebGPU (or WASM fallback) and no external API.
- **How:** Use `createSmolLM2OnnxCaller(opts)` → `runllmonce(agent, callllm, systemPrompt)`, or `runAgentWithSmolLM2Once` / `runAgentWithSmolLM2Loop` from `llmagent.ts`.

### Option B': SmolLM2 + Transformers.js pipeline (lighter)

- **Models:** `HuggingFaceTB/SmolLM2-135M-Instruct` (smallest) | `SmolLM2-360M-Instruct` | `SmolLM2-1.7B-Instruct`.
- **Runtime:** **Transformers.js** (`@huggingface/transformers` or Xenova variants). Use the `text-generation` pipeline with the desired model ID.
- **Use when:** You need smaller models, CPU fallback, or simpler pipeline integration.
- **How:** Load the pipeline, then in your look callback: `formatacklookfortext(data)` as user content, run the pipeline, take the first line of the output, and call `agent.cli(firstLine)`. You can wrap that in a small `LLMCALLER` and pass it to `runllmonce`.

### Option C: Xenova / small non-instruct

- **Examples:** `Xenova/LaMini-Cerebras-256M`, `Xenova/distilgpt2`, `Xenova/gpt2`.
- **Use when:** You want the smallest possible bundle and can rely on strict prompting + parsing. Less reliable for “exactly one command” than instruct models.

---

## 4. Concrete next steps

1. **Remote API:** Use `createopenailikecaller(url, () => ({ Authorization: 'Bearer …' }))` and `runllmonce(agent, callllm)` to drive the agent with an external chat API.
2. **Phi-3 in-browser:** Clone or mirror [onnxruntime-inference-examples/js/chat](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/chat), load `microsoft/Phi-3-mini-4k-instruct-onnx-web`, and plug in `formatacklookfortext(acklook)` + system prompt; on each generation, call `agent.cli(firstLine)`.
3. **SmolLM2 in-browser (ONNX):** Use `runAgentWithSmolLM2Loop(agent, systemPrompt?, opts?, intervalMs?)` from `llmagent.ts`. This loads `SmolLM2-1.7B-Instruct` via onnxruntime-web, then runs look → LLM → cli in a loop. Or use `createSmolLM2OnnxCaller` + `runllmonce` yourself.
4. **Loop:** From heavy (or wherever agents are started), after starting an agent, call `runllmonce(agent, callllm)` in a loop (e.g. `setTimeout` or `requestAnimationFrame` + delay) so the agent keeps looking → LLM → cli.
5. **System prompt:** Use a short instruction, e.g. “You are playing a text/grid game. Reply with exactly one CLI command: a single line the game understands (e.g. n, s, e, w, take key, #help). No explanation, only the command.”

---

## 5. Files in this folder

| File | Role |
|------|------|
| `agent.ts` | Agent lifecycle, `cli()`, `look()`, acklook handling. |
| `formatacklook.ts` | `formatacklookfortext(data)` → string for LLM. |
| `llmagent.ts` | `runllmonce`, `runllmonceAsync`, `createopenailikecaller`, `runAgentWithSmolLM2Once`, `runAgentWithSmolLM2Loop`, `LLMCALLER`. |
| `smollm2onnx.ts` | `createSmolLM2OnnxCaller()` — SmolLM2-1.7B-Instruct ONNX via onnxruntime-web; use with `runllmonce`. |
