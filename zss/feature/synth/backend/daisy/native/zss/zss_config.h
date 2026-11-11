/**
 * ZSS synth — shared constants and enums.
 *
 * Control buffer layout must stay in sync with:
 *   wasmsabchannels.ts, daisycontrol.ts, wasm*configsab.ts
 */
#pragma once

namespace zss_daisy {

constexpr int kVoiceCount = 8;
constexpr int kPlayVoiceCount = 4;
constexpr int kVoiceStride = 6;
constexpr int kDrumCount = 12;
constexpr int kFxGroups = 4;
constexpr int kFxSendCount = 7;
constexpr int kFxParamCount = 20;
/** 0–5 env/port/vol; 6–9 pluck or string ensemble */
constexpr int kVoiceCfgStride = 10;
constexpr int kOscCfgStride = 21;
constexpr int kAlgoCfgStride = 26;
constexpr int kVibratoGroups = 3;
constexpr int kVibratoStride = 4;

constexpr int kVoicesLen = kVoiceCount * kVoiceStride;
constexpr int kDrumsLen = kDrumCount * 2;
constexpr int kMainLen = 8;
/** zss_main SAB indices (match wasmmainsab.ts WASM_MAIN_IDX). */
constexpr int kMainCompBypassIdx = 3;
constexpr int kMainScBypassIdx = 4;
/** 1 = mute sidechain key (duck stays wired at idle makeup; no triggers). */
constexpr int kMainScKeyMuteIdx = 5;
/** Raw `#vol` (0-100) for drum stem scale via readdrumvolume(). */
constexpr int kMainVolIdx = 6;
/** 1 = bypass master Daisy Limiter (debug / offline A/B). */
constexpr int kMainLimBypassIdx = 7;
constexpr int kFxLen = kFxGroups * kFxSendCount + kFxGroups * kFxParamCount;
constexpr int kVoiceCfgLen = kVoiceCount * kVoiceCfgStride;
constexpr int kOscCfgLen = kVoiceCount * kOscCfgStride;
constexpr int kAlgoCfgLen = kVoiceCount * kAlgoCfgStride;
constexpr int kVibratoLen = 1 + kVibratoGroups * kVibratoStride;
/** Live #play / #bgplay event ring. Header + cap * stride. Must match
 * playevents.ts. */
constexpr int kPlayRingCap = 32;
constexpr int kPlayEventStride = 7;
constexpr int kPlayRingHeader = 2;
constexpr int kPlayEventsLen =
    kPlayRingHeader + kPlayRingCap * kPlayEventStride;
constexpr int kPlayAppliedCap = 64;
constexpr int kPlayEventNoteOn = 1;
constexpr int kPlayEventNoteOff = 2;
constexpr int kPlayEventDrum = 3;
constexpr int kControlLen = kVoicesLen + kDrumsLen + kMainLen + kFxLen +
                            kVoiceCfgLen + kOscCfgLen + kAlgoCfgLen +
                            kVibratoLen + kPlayEventsLen;

constexpr int kNoiseLfsrCount = 131072;
constexpr int kNoiseSoftCount = 32768;
constexpr int kNoiseSoftMask = kNoiseSoftCount - 1;
constexpr int kEchoBufLen = 88200;
constexpr int kRevCombMaxLen = 4096;

constexpr float kPi = 3.14159265358979323846f;
constexpr float kTwoPi = 6.28318530718f;
/** `#synth sine`, `amsine`, and `fmsine`. Other am/fm carriers use their family
 * gain. */
constexpr float kSineVoiceGain = 2.5f;
/** Makeup vs square RMS for triangle / sawtooth carriers. */
constexpr float kTriangleVoiceGain = 1.23f;
constexpr float kSawtoothVoiceGain = 1.28f;
constexpr float kAmVoiceGain = 2.f;
constexpr float kFmVoiceGain = 1.f;
constexpr float kFatVoiceGain = 1.f;
constexpr float kBellsVoiceGain = 0.35f;
constexpr float kFmHzScale = 1.f;
constexpr float kAlgoOpGain = 0.31622776601683794f;
constexpr float kAlgoOutGain = 0.95f;
constexpr float kNoiseVoiceGain = 4.5f;
constexpr float kLfsrVoiceBoost = 1.6f;
constexpr float kNoiseBaseExpr = 0.19f;
constexpr float kNoiseSoftGain = 1.1f;
/** Cafe ear: LFSR/soft noise scanned 3 octaves above note Hz (×8). */
constexpr float kNoiseHzOctaveBoost = 3.f;
constexpr float kNoiseHzMult = 8.f; // 2^kNoiseHzOctaveBoost
constexpr float kMetallicNorm = 1.f / 22.f;
constexpr float kMetallicAmp = 4.f;

/** `#synth string` = detuned saws + PWM FM; pluck = Daisy StringVoice */
constexpr float kStringMachineGain = 1.35f;
constexpr float kStringPluckGain = 4.2f;
/** DaisySP Karplus: damping >= 0.95 crossfades toward infinite ring. */
constexpr float kKarplusMaxDamping = 0.85f;
constexpr float kStringMaxDetuneCents = 8.f;
constexpr float kStringMaxVibCents = 8.f;
constexpr float kStringSubOctaveMix = 0.1f;
constexpr float kStringBodyLowMix = 0.18f;
constexpr float kStringBodyHiMix = 0.1f;
constexpr float kStringBowNoiseMix = 0.03f;

/** Wind algos: flute=0 clarinet=1 brass=2 panpipe=3 */
constexpr float kWindFluteGain = 3.11f;
constexpr float kWindClarinetGain = 1.79f;
constexpr float kWindBrassGain = 2.5f;
constexpr float kWindPanpipeGain = 3.41f;
/** Post-LP breath: short attack chiff + optional tiny sustain air.
 * Continuous must stay low — constant hiss under the note is wrong.
 * Scales multiply `#synth breath`. Legacy was cont 0.65 / burst 1.35. */
constexpr float kWindFluteBreathCont = 0.04f;
constexpr float kWindFluteBreathBurst = 0.42f;
constexpr float kWindClarinetBreathCont = 0.02f;
constexpr float kWindClarinetBreathBurst = 0.55f;
constexpr float kWindBrassBreathCont = 0.04f;
constexpr float kWindBrassBreathBurst = 0.60f;
constexpr float kWindPanpipeBreathCont = 0.04f;
constexpr float kWindPanpipeBreathBurst = 0.42f;
constexpr float kPianoVoiceGain = 3.15f;
constexpr float kTimpaniVoiceGain = 0.70f;
constexpr float kBowedVoiceGain = 1.2f;
constexpr float kGuitarVoiceGain = 4.4f;
/** Tonewheel organ harmonic stack (drawbar voice type removed). */
constexpr float kOrganTonewheelGain = 1.8f;
constexpr float kDripVoiceGain = 1.32f;
/** DaisySP Drip dettack: seconds until shake energy is forced to zero. */
constexpr float kDripDettackSec = 0.35f;
constexpr float kDootVoiceGain = 1.15f;
/** Tone MembraneSynth defaults: start at note*octaves, ramp to note. */
constexpr float kDootOctaves = 10.f;
constexpr float kDootPitchDecaySec = 0.05f;

/** Folded into flat kDrumGains; kept so drumtick/tweet call sites stay. */
constexpr float kDrumTickTrim = 1.f;
constexpr float kDrumTweetTrim = 1.f;

constexpr float kVoiceOutGain = 1.f;

/*
 * Parity-tuned constants — change only with yarn *:calibrate or intentional
 * re-tune, then yarn daisy-regression:test (local; CI runs Jest only).
 *
 *   kEnvDecayTauScale / kEnvReleaseTauScale  → yarn synth-env-parity:test:full
 *   kDrumBusGain                            → yarn play-drum-balance:test:full
 *   kScMix (+ kScMakeupDb below)            → yarn sidechain-parity:test:full
 */
constexpr float kEnvDecayTauScale = 0.700f;
constexpr float kEnvReleaseTauScale = 0.060f;

/** Retired from live play stem (play uses shared SAB dB law). Kept so
 * play-drum-balance:calibrate can still rewrite this symbol.
 */
constexpr float kPlayBusGain = 1.000f;
/** Stem-balanced vs play (play stem uses shared SAB dB law like bg/tts).
 * Mid-kit (hi snare proxy) sits near unity with play.
 */
/** Was 1.618; cafe ear — kit slammed limiter and ducked play. */
constexpr float kDrumBusGain = 1.0f;
/** Post-limiter makeup removed: output leans on DaisySP Limiter alone, then a
 * safety +/-1 clamp. (Old pad/SoftLimit makeup pushed peaks back to 0 dBFS.) */
/** Play / bg / tts / drum (`#vol`) share SAB dB law
 * kBusVolDbPerDecade*log10(vol)+kBusVolOffsetDb
 * (readplayvolume / readbgplayvolume / readttsvolume / readdrumvolume).
 * 60 makes #vol 50→100 ≈ +18 dB so mid is quieter while vol 100 stays
 * ~+15 dB (offset -105). Boot stem SAB 45 ≈ -5.8 dB. */
constexpr float kBusVolDbPerDecade = 60.f;
constexpr float kBusVolOffsetDb = -105.f;

/**
 * Sidechain makeup on the play duck path. Tone product used +24 dB (with mix
 * 0.75 ≈ +22 dB idle play); that buried drums. Trying +5 dB.
 */
constexpr float kScMakeupDb = 5.f;
/** Duck onset — Tone product was 5 ms; 1 ms so drum hits punch the play bus. */
constexpr float kScAttackSec = 0.001f;
constexpr float kScReleaseSec = 0.06f;

constexpr float kRazzleVibratoWet = 0.02f;
constexpr float kRazzleChorusWet = 0.25f;
constexpr float kRazzleHissGain = 0.0007f;
constexpr float kRazzleChorusBaseSec = 0.007f;
constexpr float kRazzleChorusDepthSec = 0.007f;

/** Main compressor (-24 / 4:1 / 3ms / 150ms / knee 30). Was Tone -28;
 * raised so stems keep more peak before the limiter. */
constexpr float kMainCompThresholdDb = -24.f;
constexpr float kMainCompRatio = 4.f;
constexpr float kMainCompKneeDb = 30.f;
constexpr float kMainCompAttackSec = 0.003f;
constexpr float kMainCompReleaseSec = 0.15f;
constexpr float kMainCompGainAttackSec = 0.008f;
constexpr float kMainCompGainReleaseSec = 0.15f;
constexpr float kMainCompMix = 1.f;
constexpr float kMainCompSilenceFloor = 1e-4f;
constexpr float kMainCompSilenceDecay = 0.9995f;
constexpr float kSynthNoteOnDuckSec = 0.001f;
constexpr float kSynthNoteOnFadeSec = 0.003f;
/** sine / amsine / fmsine: half a cycle, held between the floors and this cap.
 */
constexpr float kSynthNoteOnRampMaxSec = 0.010f;

/** Post-gain after ReverbSc (internal kOutputGain 0.35 in reverbsc.cpp) */
constexpr float kReverbPostGain = 1.5f;
/** Pre-gain into DaisySP Overdrive for `#distort` (gain-levels /
 * parallel-fx-bus). */
constexpr float kDistortPreGain = 3.f;
constexpr float kReverbScLpHz = 10000.f;
/** Parallel FX return bus — see docs/parallel-fx-bus.md */
constexpr float kFxReturnCompThresholdDb = -24.f;
constexpr float kFxReturnCompRatio = 4.f;
constexpr float kFxReturnCompKneeDb = 6.f;
constexpr float kFxReturnCompAttackSec = 0.002f;
constexpr float kFxReturnCompReleaseSec = 0.08f;
constexpr float kFxReturnWetTrim = 1.4f;
/** Sidechain wet mix (Tone product 0.75). Idle duck ≈ 1 +
 * (10^(makeup/20)-1)*mix. */
constexpr float kScMix = 0.75f;
constexpr float kScTriggerFloor = 1e-5f;
constexpr float kAutowahDefaultOct = 6.f;
constexpr float kAutowahDefaultSensDb = -3.f;
constexpr float kAutowahDefaultGain = 25.f;

/** Flat kit trim: every digit ~0.05 (−26 dB) into drum bus before kDrumBusGain.
 */
constexpr float kDrumGains[kDrumCount] = {
    0.05f, 0.05f, 0.05f, 0.05f, 0.05f, 0.05f,
    0.05f, 0.05f, 0.05f, 0.05f, 0.05f, 0.05f,
};
/** Was +8 dB Tone makeup; zeroed so cowbell matches flat kDrumGains. */
constexpr float kDrumCowbellVolumeDb = 0.f;
/** Kick makeup; was +6 dB (Tone Membrane volume) but sat too hot vs kit. */
constexpr float kDrumBassVolumeDb = 0.f;
/** Tone MembraneSynth `volume: 8` into drumaction only — not the audible kit.
 */
constexpr float kScDrumBassKeyDb = 8.f;
/** Clap/bass key bus into detector (Tone drumaction was −28; trying −20). */
constexpr float kScDrumKeyDb = -20.f;

enum VoiceType {
  kSynth = 0,
  kRetroNoise = 1,
  kBuzzNoise = 2,
  kClangNoise = 3,
  kMetallicNoise = 4,
  kBells = 5,
  kDoot = 6,
  kAlgoSynth = 7,
  kHollowNoise = 8,
  kWhiteNoise = 9,
  kStringVoice = 10,
  kDripVoice = 11,
  kWindVoice = 12,
  kPianoVoice = 13,
  kTimpaniVoice = 14,
  kBowedVoice = 15,
  kGuitarVoice = 16,
  kOrganVoice = 17,
};

enum FxSend {
  kFxFc = 0,
  kFxEcho = 1,
  kFxReverb = 2,
  kFxAutofilter = 3,
  kFxVibrato = 4,
  kFxDistort = 5,
  kFxAutowah = 6,
};

enum FxParam {
  kFxEchoDelay = 0,
  kFxEchoFeedback = 1,
  kFxReverbDecay = 2,
  kFxReverbPredelay = 3,
  kFxFcRate = 4,
  kFxDistortion = 5,
  kFxAutofilterFreq = 6,
  kFxAutofilterDepth = 7,
  kFxVibratoMaxdelay = 8,
  kFxAutowahSens = 9,
  kFxVibratoDepth = 10,
  kFxVibratoFreq = 11,
  kFxAutowahBase = 12,
  kFxAutowahOct = 13,
  kFxAutowahGain = 14,
  kFxAutowahFollow = 15,
  kFxAutofilterBase = 16,
  kFxAutofilterOct = 17,
  kFxAutofilterQ = 18,
  kFxAutofilterType = 19,
};

} // namespace zss_daisy
