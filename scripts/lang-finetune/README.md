# Gemma ZSS script fine-tune (HuggingFace Jobs)

## Prerequisites

1. `yarn lang:build-train-corpus` — writes `zss/feature/heavy/training/corpus/{train,eval}.jsonl`
2. `yarn lang:train-corpus:test` — compile pass rate gate (≥95%)
3. HuggingFace account + token with write access

## Environment

| Variable | Purpose |
|----------|---------|
| `ZSS_HF_BASE_MODEL` | Gemma instruct PyTorch id (not ONNX) |
| `ZSS_HF_OUTPUT_DIR` | LoRA adapter output |
| `ZSS_HF_ADAPTER_REPO` | Optional HF Hub push for adapter |
| `ZSS_HF_ONNX_REPO` | HF Hub repo for merged/ONNX weights |
| `ZSS_HEAVY_LLM_GEMMA_MODEL_ID` | Runtime preset override in app |

## Local GPU

```bash
pip install -r scripts/lang-finetune/requirements.txt
yarn lang:finetune:train
yarn lang:finetune:export
yarn lang:finetune:eval
```

## HuggingFace Jobs

1. Upload `zss/feature/heavy/training/corpus/train.jsonl` as a dataset or clone repo in job.
2. Use `scripts/lang-finetune/train.py` as job command with GPU hardware.
3. Export with `export_onnx.py` on a CPU/GPU job.
4. Publish ONNX to your org; set `ZSS_HEAVY_LLM_GEMMA_MODEL_ID` to replace default `gemma` preset.

## Ship to players

When eval passes, the app loads `ZSS_HEAVY_LLM_GEMMA_MODEL_ID` if set, else `onnx-community/gemma-4-E2B-it-ONNX`.
