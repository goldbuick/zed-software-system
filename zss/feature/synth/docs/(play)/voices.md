---
title: Synth
description: Player reference for #synth voices and their config keys.
---

`#synth <name>` selects a voice for all four `#play` channels. `#synth1` through `#synth4` set one play voice. `#synth5` sets the `#bgplay` voices. Parameter detail and backend status: [voice types](/synth/voice-types-reference).

## Waves

### sine

`#synth sine`

### square

`#synth square`

### triangle

`#synth triangle`

### sawtooth

`#synth sawtooth`

### custom

`#synth custom`

### phase

`#synth phase <degrees>`

The phase is the starting position within the oscillator's cycle. For example a phase of 180 would start halfway through the oscillator's cycle. Used by sine, square, triangle, sawtooth, custom, and the fat waves.

### pwm

`#synth pwm`

### modfreq

`#synth modfreq <frequency>`

This sets the frequency of change for the pulse width of this oscillator.

### pulse

`#synth pulse`

### width

`#synth width <range>`

A number that is between [-1, 1]. Altering this value changes the shape of the square wave.

### amsine

`#synth amsine`

### amsquare

`#synth amsquare`

### amtriangle

`#synth amtriangle`

### amsawtooth

`#synth amsawtooth`

### harmonicity

`#synth harmonicity <number>`

Harmonicity is the frequency ratio between the carrier and the modulator oscillators. A harmonicity of 1 gives both oscillators the same frequency. Harmonicity = 2 means a change of an octave. Used by the am and fm waves.

### modtype

`#synth modtype <sine, square, triangle, sawtooth>`

Used by the am and fm waves.

### modenv

`#synth modenv <a> <d> <s> <r>`

In seconds. Used by the am and fm waves.

### fmsine

`#synth fmsine`

### fmsquare

`#synth fmsquare`

### fmtriangle

`#synth fmtriangle`

### fmsawtooth

`#synth fmsawtooth`

### modindex

`#synth modindex <degrees>`

The modulation index, the depth or amount of the modulation. It is the ratio of the frequency of the modulating signal (mf) to the amplitude of the modulating signal (ma), as in ma/mf. Used by the fm waves.

### fatsine

`#synth fatsine`

### fatsquare

`#synth fatsquare`

### fattriangle

`#synth fattriangle`

### fatsawtooth

`#synth fatsawtooth`

### count

`#synth count <number>`

This sets the number of oscillators to spread along the given range. Used by the fat waves.

### spread

`#synth spread <cents>`

This signals the number of cents between oscillators. On fat waves this is cents, not the piano unison amount.

## Noise and chips

### retro

`#synth retro`

### buzz

`#synth buzz`

### clang

`#synth clang`

### metallic

`#synth metallic`

### noise

`#synth noise`

### hollow

`#synth hollow`

### bells

`#synth bells`

### doot

`#synth doot`

## Algo and instruments

### algo0

`#synth algo0`

Signal flow legend: s1, s2, s3, s4 are sound sources. m is modulator. c is carrier. `-->` is signal flow.

```text
S1 --> M --> S2 --> M --> S3 --> M --> S4 --> C
```

### harmonicity1

`#algo0 harmonicity <number>`

`#algo0 harmonicity1` through `harmonicity3`.

### modindex1

`#algo0 modindex <number>`

`#algo0 modindex1` through `modindex3`.

### osc1

`#algo0 osc1` through `osc4 <sine, square, triangle, sawtooth, pulse, pwm>`

### env1

`#algo0 env1` through `env4 <a> <d> <s> <r>`

### algo env

`#algo0 env <a> <d> <s> <r>`

### algo port

`#algo0 port <seconds>`

### algo vol

`#algo0 vol <db>`

The same keys apply to algo1 through algo7, including the 1-5 channel forms.

### algo1

`#synth algo1`

### algo2

`#synth algo2`

### algo3

`#synth algo3`

### algo4

`#synth algo4`

### algo5

`#synth algo5`

### algo6

`#synth algo6`

### algo7

`#synth algo7`

### string

`#synth string`

### detune

`#synth detune <0-1>`

### string pwm

`#synth pwm <0-1>`

### vib

`#synth vib <0-1>`

### filter

`#synth filter <0-1>`

### string env

`#synth env <a> <d> <s> <r>`

### string vol

`#synth vol <db>`

Select with `#synth string`, then set a key with `#synth detune`. `#synth1` through `#synth4` set one play voice. `#synth5` is bgplay.

### pluck

`#synth pluck`

### structure

`#synth structure <0-1>`

### pluck brightness

`#synth brightness <0-1>`

### pluck damping

`#synth damping <0-1>`

### accent

`#synth accent <0-1>`

### pluck env

`#synth env <a> <d> <s> <r>`

### pluck vol

`#synth vol <db>`

### flute

`#synth flute`

### breath

`#synth breath <0-1>`

### pressure

`#synth pressure <0-1>`

### flute brightness

`#synth brightness <0-1>`

### resonance

`#synth resonance <0-1>`

### flute env

`#synth env <a> <d> <s> <r>`

### flute vol

`#synth vol <db>`

### clarinet

`#synth clarinet`

The same keys as flute.

### brass

`#synth brass`

The same keys as flute.

### piano

`#synth piano`

### piano spread

`#synth spread <0-1>`

### hammer

`#synth hammer <0-1>`

### piano brightness

`#synth brightness <0-1>`

### piano damping

`#synth damping <0-1>`

### piano env

`#synth env <a> <d> <s> <r>`

### piano vol

`#synth vol <db>`

### violin

`#synth violin`

### bow

`#synth bow <0-1>`

### violin pressure

`#synth pressure <0-1>`

### violin vib

`#synth vib <0-1>`

### body

`#synth body <0-1>`

### violin port

`#synth port <seconds>`

### violin env

`#synth env <a> <d> <s> <r>`

### violin vol

`#synth vol <db>`

### steel

`#synth steel`

### pick

`#synth pick <0-1>`

### steel body

`#synth body <0-1>`

### steel damping

`#synth damping <0-1>`

### position

`#synth position <0-1>`

### steel env

`#synth env <a> <d> <s> <r>`

### steel vol

`#synth vol <db>`

### tonewheel

`#synth tonewheel`

### drawbar

`#synth drawbar <0-1>`

Drawbar is an organ parameter, not a voice type.

### click

`#synth click <0-1>`

### leak

`#synth leak <0-1>`

### bright

`#synth bright <0-1>`

### tonewheel env

`#synth env <a> <d> <s> <r>`

### tonewheel vol

`#synth vol <db>`

## Shared settings

Configs survive a type switch until restart.

### restart

`#synth restart`

Clears config memory.

### vol

`#synth vol <db>`

Control volume.

### port

`#synth port <seconds>`

Portamento time.

### env

`#synth env <a> <d> <s> <r>`
