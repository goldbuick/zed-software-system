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
    Flat[Flatten all notes sort ticks track midi]
    Scan[Scan sorted notes for new tracks]
    U[Up to four distinct tracks first global appearance]
    Build[Build layers melodic or merged drums]
    Cap[Note count cap 12000 truncation flag]
  end
  subgraph perbar [Per measure m]
    Span["start/end from midimeasurespans — active time sig per bar"]
    L0[Per layer monophonelineinmeasure or drumlineinmeasure]
    Join["segs.join PLAY_VOICE_SEPARATOR"]
    Pad{m equals 0 and drums only?}
    Unshift["prepend playreststringforticks span"]
    Pad2{m equals 0 empty melodic with other sound?}
    Fill0["fill that melodic seg playreststringforticks span"]
  end
  MidiObj --> Flat
  Flat --> Scan
  Scan --> U
  U --> Build
  Build --> Cap
  Cap --> Span
  Span --> L0
  L0 --> Join
  Join --> Pad
  Pad -->|yes| Unshift
  Pad -->|no| Pad2
  Unshift --> Out[snippets m]
  Pad2 -->|yes| Fill0
  Pad2 -->|no| Out
  Fill0 --> Out
```

- **Track selection:** [`midiselecttracksfromfirstnotes`](../midiplay.ts) — sort every note by **`(ticks, track index, MIDI pitch)`**, then walk the list and append a track to **U** the **first** time that track appears, stopping when **U** has four tracks or the list ends. Many simultaneous notes on one track only consume **one** slot in **U**, so other tracks that start later in the timeline are still reachable (**no** global “always import all drums” pass). Channel **9** is included only if it appears in **U**; multiple selected drum tracks still merge into **one** drum layer at the **first** drum position in **U**.
- **Voice cap:** at most **four** `;`-separated segments per `#play` (`MAX_VOICES_PER_PLAY`). Layers follow **U** order (melodic track = one segment; selected drums = one merged segment).
- **Measure boundaries:** [`midimeasurespans`](../midiplay.ts) walks the file using [`miditickspersmeasure`](../midiplay.ts) at each bar start so **meter changes** stay aligned (previously a single length from tick 0 was used for every bar).
- **Per voice in bar:** [`monophonelineinmeasure`](../midiplay.ts) / [`drumlineinmeasure`](../midiplay.ts) — notes filtered to `[start, end)`, gaps filled with [`appendplayrests`](../midiplay.ts) (internal).
- **Token shape (ZZT-style):** **Melodic:** for each note, `+`/`-` to target octave (from baseline 3), then duration op (`ytsiqhw`), then letter + optional `#`/`!` (see [`playnotation.ts`](../../synth/playnotation.ts)). **Drums:** duration then drum token (digits `0`–`9` or `p` for GM note 39 hand clap; see map in [`midiplay.ts`](../midiplay.ts)). **Rests:** duration then `x` (duration carries until the next op). [`playreststringforticks`](../midiplay.ts) builds a rest-only first voice when needed.
- **Drum-only:** on **measure 0 only**, prepend full-bar rest (e.g. `wx; ` before drums) so the first voice is silent and drums land on the next parseplay segment; later measures omit this pad (see [`midiplaysnippetsbymeasure`](../midiplay.ts) tail).

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
#play <measure0 all voices joined by ; >
#play <measure1 ...>
...
#end
```

Example (`twomeasures.mid` fixture): track **0** is seen first globally; track **1** is added when its first note appears at the next measure boundary, so both voices import:

```text
#play +qcdef; wx
#play +qgaa#+c; +qefga
```

## 4. One `#play` line → runtime (`parseplay`)

```mermaid
flowchart LR
  Line["#play voice0; voice1; drums"]
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
