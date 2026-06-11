#!/usr/bin/env python3
"""
LoRA SFT for Gemma instruct on ZSS corpus JSONL (HF Jobs or local GPU).

Usage:
  export ZSS_HF_BASE_MODEL=google/gemma-3-4b-it   # set to your Gemma 4 instruct id
  export ZSS_HF_OUTPUT_DIR=./out/gemma-zss-lora
  yarn lang:finetune:train

Upload train.jsonl to HF Jobs or mount repo path. See README.md.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "zss/feature/heavy/training/corpus"
TRAIN_JSONL = CORPUS / "train.jsonl"
EVAL_JSONL = CORPUS / "eval.jsonl"

BASE_MODEL = os.environ.get("ZSS_HF_BASE_MODEL", "google/gemma-3-4b-it")
OUTPUT_DIR = os.environ.get("ZSS_HF_OUTPUT_DIR", str(ROOT / "out/gemma-zss-lora"))
HF_REPO = os.environ.get("ZSS_HF_ADAPTER_REPO", "")


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def row_to_text(row: dict, tokenizer) -> str:
    messages = row["messages"]
    return tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )


def main() -> None:
    if not TRAIN_JSONL.is_file():
        raise SystemExit(
            f"missing {TRAIN_JSONL} — run yarn lang:build-train-corpus first"
        )

    train_rows = load_jsonl(TRAIN_JSONL)
    eval_rows = load_jsonl(EVAL_JSONL) if EVAL_JSONL.is_file() else []

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    train_texts = [row_to_text(r, tokenizer) for r in train_rows]
    eval_texts = [row_to_text(r, tokenizer) for r in eval_rows]

    train_ds = Dataset.from_dict({"text": train_texts})
    eval_ds = Dataset.from_dict({"text": eval_texts}) if eval_texts else None

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype="auto",
        device_map="auto",
    )
    lora = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, lora)

    args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=float(os.environ.get("ZSS_HF_EPOCHS", "3")),
        per_device_train_batch_size=int(
            os.environ.get("ZSS_HF_BATCH_SIZE", "2")
        ),
        gradient_accumulation_steps=int(
            os.environ.get("ZSS_HF_GRAD_ACCUM", "4")
        ),
        learning_rate=float(os.environ.get("ZSS_HF_LR", "2e-4")),
        logging_steps=10,
        save_steps=200,
        eval_strategy="steps" if eval_ds is not None else "no",
        eval_steps=100,
        bf16=True,
        report_to=[],
    )

    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    if HF_REPO:
        model.push_to_hub(HF_REPO)
        tokenizer.push_to_hub(HF_REPO)

    print(f"saved adapter to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
