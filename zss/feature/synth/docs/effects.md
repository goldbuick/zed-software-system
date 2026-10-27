---
title: Effects
description: Player reference for #fcrush, #echo, #reverb, #autofilter, #distort, #vibrato, and #autowah.
---

Each effect takes a send level from 0 to 100. 0 is off and 100 is full volume. Turn one on with `#fcrush on`, `#echo on`, and the same `on` form for the others. Parameter detail and backend status: [FX types](/synth/fx-types-reference).

## fcrush

### fcrush level

`#fcrush <number>`

0-100. 0 is off, 100 is full volume.

### rate

`#fcrush rate <number>`

1 or higher. More rate, more crush.

## echo

### echo level

`#echo <number>`

0-100. 0 is off, 100 is full volume.

### delaytime

`#echo delaytime <seconds or notation>`

Duration between echos. Seconds (for example 1) or note values 1n, 2n, 4n, 8n, 16n, 32n, 64n, 128n.

### feedback

`#echo feedback <number>`

A number between 0 and 1. 1 is forever feedback and 0 is none.

## reverb

### reverb level

`#reverb <number>`

0-100. 0 is off, 100 is full volume.

### predelay

`#reverb predelay <seconds>`

The amount of time before the reverb is fully ramped in.

### decay

`#reverb decay <seconds>`

The duration of the reverb.

## autofilter

### autofilter level

`#autofilter <number>`

0-100. 0 is off, 100 is full volume.

### depth

`#autofilter depth <number>`

Controls the intensity of the filter.

### frequency

`#autofilter frequency <number>`

The rate of oscillation of the effect.

### autofilter octaves

`#autofilter octaves <number>`

Controls the range of the effect.

### q

`#autofilter q <number>`

Sets the intensity of the effect.

### type

`#autofilter type <lowpass, highpass, ...>`

Sets the behavior of the filter. Filter type names: [BiquadFilterNode type](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type).

## distort

### distort level

`#distort <number>`

0-100. 0 is off, 100 is full volume.

### distortion

`#distort distortion <number>`

0 or higher. Controls the strength of the effect.

### oversample

`#distort oversample <2x|4x|none>`

Oversample improves quality.

## vibrato

### vibrato level

`#vibrato <number>`

0-100. 0 is off, 100 is full volume.

### maxdelay

`#vibrato maxdelay <seconds>`

A longer delay increases the vibrato.

## autowah

### autowah level

`#autowah <number>`

0-100. 0 is off, 100 is full volume.

### basefrequency

`#autowah basefrequency <frequency>`

The frequency the filter is set to at the low point of the wah.

### autowah octaves

`#autowah octaves <number>`

The number of octaves above the base frequency the filter will sweep to when fully open.

### sensitivity

`#autowah sensitivity <number>`

The decibel threshold sensitivity for the incoming signal. Normal range of -40 to 0.

### gain

`#autowah gain <number>`

Controls the loudness of the effect.

### follower

`#autowah follower <seconds>`

Sets the smoothing time for the effect.
