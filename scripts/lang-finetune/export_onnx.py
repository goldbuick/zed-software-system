#!/usr/bin/env python3
"""
Merge LoRA adapter and export Gemma to ONNX for Transformers.js (q4 path manual).

Usage:
  export ZSS_HF_BASE_MODEL=google/gemma-3-4b-it
  export ZSS_HF_ADAPTER_DIR=./out/gemma-zss-lora
  export ZSS_HF_MERGED_DIR=./out/gemma-zss-merged
  export ZSS_HF_ONNX_DIR=./out/gemma-zss-onnx
  yarn lang:finetune:export

Then upload ZSS_HF_ONNX_DIR to HuggingFace Hub and set ZSS_HEAVY_LLM_GEMMA_MODEL_ID.
"""
from __future__ import annotations

import os
from pathlib import Path

from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parents[2]

BASE_MODEL = os.environ.get("ZSS_HF_BASE_MODEL", "google/gemma-3-4b-it")
ADAPTER_DIR = os.environ.get(
    "ZSS_HF_ADAPTER_DIR", str(ROOT / "out/gemma-zss-lora")
)
MERGED_DIR = os.environ.get(
    "ZSS_HF_MERGED_DIR", str(ROOT / "out/gemma-zss-merged")
)
ONNX_DIR = os.environ.get("ZSS_HF_ONNX_DIR", str(ROOT / "out/gemma-zss-onnx"))
HF_ONNX_REPO = os.environ.get("ZSS_HF_ONNX_REPO", "")


def main() -> None:
    adapter_path = Path(ADAPTER_DIR)
    if not adapter_path.is_dir():
        raise SystemExit(
            f"missing adapter {adapter_path} — run yarn lang:finetune:train first"
        )

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype="auto",
        device_map="cpu",
    )
    model = PeftModel.from_pretrained(base, str(adapter_path))
    merged = model.merge_and_unload()
    merged.save_pretrained(MERGED_DIR)
    tokenizer.save_pretrained(MERGED_DIR)
    print(f"merged weights -> {MERGED_DIR}")

    onnx_path = Path(ONNX_DIR)
    onnx_path.mkdir(parents=True, exist_ok=True)

    try:
        from optimum.onnxruntime import ORTModelForCausalLM

        ort_model = ORTModelForCausalLM.from_pretrained(
            MERGED_DIR,
            export=True,
        )
        ort_model.save_pretrained(str(onnx_path))
        tokenizer.save_pretrained(str(onnx_path))
        print(f"onnx export -> {onnx_path}")
    except Exception as err:
        print(
            "optimum ONNX export failed — run optimum-cli manually:",
            err,
        )

    if HF_ONNX_REPO:
        merged.push_to_hub(HF_ONNX_REPO)
        tokenizer.push_to_hub(HF_ONNX_REPO)
        print(f"pushed merged model to {HF_ONNX_REPO}")


if __name__ == "__main__":
    main()
