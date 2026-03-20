# MIDI import: conversion and `#play` output

How **Standard MIDI Files** (`.mid`) reach the VM, how [`midiplay.ts`](../midiplay.ts) turns `@tonejs/midi` data into per-measure strings, and how [`parsemidi`](../midi.ts) writes a **codepage** aligned with [`.zzm` import](../zzm.ts). Runtime parsing of each line is [`parseplay`](../../synth/playnotation.ts) in [`playnotation.ts`](../../synth/playnotation.ts).

## 1. End-to-end file path (UI → import)

```mermaid
flowchart LR
  subgraph client [Browser / cafe]
    Drop[drop or paste file]
    VM[vmloader format file]
  end
  subgraph vmdevice [VM loader handler]
    HL[handleloader]
    PW[parsewebfile]
    HFT[handlefiletype]
  end
  subgraph routing [file.ts]
    MF[mapfiletype / sniff MThd]
    HBK[handlebinarykind mid]
  end
  subgraph import [midi.ts]
    PM[parsemidi]
    MP[midiplaysnippetsbymeasure]
  end
  Drop --> VM
  VM --> HL
  HL -->|format file| PW
  PW --> HFT
  HFT --> MF
  MF -->|mid or sniff| HBK
  HBK --> PM
  PM -->|Midi from buffer| MP
  PM -->|codepage + write| Mem[memorywritecodepage / write UI]
```

- **Entry:** [`loader.ts`](../../../device/vm/handlers/loader.ts) `case 'file'` → [`parsewebfile`](../file.ts) ([`vmloader`](../../../device/api.ts)).
- **Typing:** [`mapfiletype`](../file.ts) / [`sniffbinaryimport`](../file.ts) (`MThd` → `mid`) / extension `.mid`.
- **Import:** [`parsemidi`](../midi.ts) reads `File` with `arrayBuffer()`, `new Midi(buffer)`, then [`midiplaysnippetsbymeasure`](../midiplay.ts).

## 2. Conversion inside `midiplay` (SMF → one string per bar)

```mermaid
flowchart TB
  subgraph input [Parsed MIDI]
    MidiObj["Midi @tonejs/midi"]
    TS[header.ppq]
    SIG[timeSignatures or default 4/4]
  end
  subgraph collect [collectmidilayers]
    Loop[For each track with notes]
    Melodic[Melodic: channel not 9, max 8 tracks, file order]
    DrumB[Drum buckets: channel 9]
    Merge[mergedrumtracksnotelist sort by tick]
    Cap[Note count cap 12000, truncation flag]
  end
  subgraph perbar [Per measure m]
    Span["start = m * measureTicks, end = start + span"]
    M0[monophonelineinmeasure per melodic track]
    D0[drumlineinmeasure merged drums]
    Join["segs.join ';'"]
    Pad{m equals 0 and drums only?}
    Unshift["prepend playreststringforticks span"]
    Pad2{m equals 0 and empty voice0?}
    Fill0["segs0 equals playreststringforticks span"]
  end
  MidiObj --> Loop
  Loop --> Melodic
  Loop --> DrumB
  DrumB --> Merge
  Melodic --> M0
  Merge --> D0
  M0 --> Join
  D0 --> Join
  Join --> Pad
  Pad -->|yes| Unshift
  Pad -->|no| Pad2
  Unshift --> Out[snippets m]
  Pad2 -->|yes| Fill0
  Pad2 -->|no| Out
  Fill0 --> Out
```

- **Measure length:** [`miditickspersmeasure`](../midiplay.ts) from time signature (default `4 * ppq`).
- **Per voice in bar:** [`monophonelineinmeasure`](../midiplay.ts) / [`drumlineinmeasure`](../midiplay.ts) — notes filtered to `[start, end)`, gaps filled with [`appendplayrests`](../midiplay.ts) (internal).
- **Token shape (ZZT-style):** **Melodic:** for each note, `+`/`-` to target octave (from baseline 3), then duration op (`ytsiqhw`), then letter + optional `#`/`!` (see [`playnotation.ts`](../../synth/playnotation.ts)). **Drums:** duration then drum token (digits `0`–`9` or `p` for GM note 39 hand clap; see map in [`midiplay.ts`](../midiplay.ts)). **Rests:** duration then `x` (duration carries until the next op). [`playreststringforticks`](../midiplay.ts) builds a rest-only first voice when needed.
- **Drum-only:** on **measure 0 only**, prepend full-bar rest (e.g. `wx;`) so the first `;` segment is silent and drums land on the next parseplay voice; later measures omit this pad (see [`midiplaysnippetsbymeasure`](../midiplay.ts) tail).

## 3. Target codepage layout (`parsemidi` output)

Structure matches [`.zzm` import](../zzm.ts): one `:song_0` block with **multiple** `#play` lines (one per measure).

```text
@play_<id>
@cycle 1
@char 14
#end

:touch
"MIDI: <title>"
!song_0;play
#end

:song_0
#play <measure0 all voices joined by ;>
#play <measure1 ...>
...
#end
```

Example (two melodic tracks, no drums), from [`midi.ts`](../midi.ts):

Imported `#play` lines pad each `;`-separated voice with trailing spaces so columns line up across measures (`parseplay` skips spaces).

```text
#play +qcdef  ;wx
#play +qgaa#+c;+qefga
```

## 4. One `#play` line → runtime (`parseplay`)

```mermaid
flowchart LR
  Line["#play voice0;voice1;drums"]
  Split[parseplay split on ';']
  V0[synth index 0 invokeplay]
  V1[synth index 1 invokeplay]
  V2[synth index 2 invokeplay]
  Split --> V0
  Split --> V1
  Split --> V2
```

- **Implementation:** [`parseplay`](../../synth/playnotation.ts) in [`playnotation.ts`](../../synth/playnotation.ts).
- **Queue:** [`memoryqueuesynthplay`](../../../memory/synthstate.ts) uses the max pattern length across voices.
