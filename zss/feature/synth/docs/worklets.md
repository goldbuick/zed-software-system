# Audio Worklets

Custom AudioWorklet processors for effects not available in Tone.js.

## Frequency Crusher

### fcrushworklet.js

Sample-and-hold style bit crusher. Reduces effective sample rate for lo-fi character.

**Parameters:**
- `rate` (1-512): Samples held per output sample. Lower = more crushed.

**Algorithm:**
```javascript
if (count % rate === 0) sah[channel] = input[channel][i]
output[channel][i] = sah[channel]
count++
```

**Credits:** Timo Hoogland, (c) 2023

### fcrushworkletnode.ts

Tone.js `Effect` wrapper. Exposes `rate` as Param. Must call `addfcrushmodule()` before creating FrequencyCrusher instances.

---

## Sidechain Compressor

### sidechainworklet.js

Ducks main input based on sidechain signal level.

**Parameters:**
- `threshold` (-128 to 0 dB)
- `ratio` (1-128)
- `attack`, `release` (seconds)
- `mix` (0-1): Dry/wet
- `makeupGain` (-128 to 60 dB)

**Inputs:**
- Input 0: Main signal (stereo)
- Input 1: Sidechain (stereo, summed to mono for detection)

**Algorithm:** Level detection on sidechain → gain reduction applied to main → mix with dry.

**Credits:** Based on [jadujoel/sidechain-compressor-audio-worklet](https://github.com/jadujoel/sidechain-compressor-audio-worklet)

### sidechainworkletnode.ts

Tone.js `Effect` wrapper. `sidechain` property is a Gain node—connect sidechain sources to it. Must call `addsidechainmodule()` before creating SidechainCompressor instances.
