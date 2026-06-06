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
constexpr int kMainLen = 5;
/** zss_main SAB indices (match wasmmainsab.ts WASM_MAIN_IDX). */
constexpr int kMainCompBypassIdx = 3;
constexpr int kMainScBypassIdx = 4;
constexpr int kFxLen = kFxGroups * kFxSendCount + kFxGroups * kFxParamCount;
constexpr int kVoiceCfgLen = kVoiceCount * kVoiceCfgStride;
constexpr int kOscCfgLen = kVoiceCount * kOscCfgStride;
constexpr int kAlgoCfgLen = kVoiceCount * kAlgoCfgStride;
constexpr int kVibratoLen = 1 + kVibratoGroups * kVibratoStride;
constexpr int kControlLen = kVoicesLen + kDrumsLen + kMainLen + kFxLen +
                            kVoiceCfgLen + kOscCfgLen + kAlgoCfgLen +
                            kVibratoLen;

constexpr int kNoiseLfsrCount = 131072;
constexpr int kNoiseSoftCount = 32768;
constexpr int kNoiseSoftMask = kNoiseSoftCount - 1;
constexpr int kEchoBufLen = 88200;
constexpr int kRevCombMaxLen = 4096;

constexpr float kPi = 3.14159265358979323846f;
constexpr float kTwoPi = 6.28318530718f;
constexpr float kSineVoiceGain = 1.42f;
constexpr float kOscModWaveGain = 0.1f;
constexpr float kAmVoiceGain = 1.f;
constexpr float kFmVoiceGain = 1.f;
constexpr float kFatVoiceGain = 1.f;
constexpr float kFmHzScale = 1.f;
constexpr float kAlgoOpGain = 0.31622776601683794f;
constexpr float kAlgoOutGain = 0.18f;
constexpr float kNoiseVoiceGain = 21.f;
constexpr float kLfsrVoiceBoost = 2.5f;
constexpr float kNoiseBaseExpr = 0.19f;
constexpr float kNoiseSoftGain = 3.f;
constexpr float kMetallicNorm = 1.f / 22.f;
constexpr float kMetallicAmp = 7.5f;

/** `#synth string` = detuned saws + PWM FM; pluck = Daisy StringVoice */
constexpr float kStringMachineGain = 0.42f;
constexpr float kStringPluckGain = 0.38f;
constexpr float kStringDefaultDetune = 2.f;
constexpr float kStringDefaultPwm = 0.2f;
constexpr float kStringDefaultVib = 2.5f;
constexpr float kStringDefaultFilter = 0.5f;
constexpr float kStringMaxDetuneCents = 8.f;
constexpr float kStringMaxVibCents = 8.f;
constexpr float kStringSubOctaveMix = 0.1f;
constexpr float kStringBodyLowMix = 0.18f;
constexpr float kStringBodyHiMix = 0.1f;
constexpr float kStringBowNoiseMix = 0.03f;

constexpr float kWindVoiceGain = 0.38f;
constexpr float kPianoVoiceGain = 0.34f;
constexpr float kTimpaniVoiceGain = 0.42f;
constexpr float kBowedVoiceGain = 0.36f;
constexpr float kGuitarVoiceGain = 0.36f;
constexpr float kOrganVoiceGain = 0.32f;

constexpr float kDrumTickTrim = 1.35f;
constexpr float kDrumTweetTrim = 1.25f;

constexpr float kVoiceOutGain = 1.f;

/*
 * Parity-tuned constants — change only with yarn *:calibrate or intentional
 * re-tune, then yarn daisy-regression:test (local; CI runs Jest only).
 *
 *   kEnvDecayTauScale / kEnvReleaseTauScale  → yarn synth-env-parity:test:full
 *   kPlayBusGain / kDrumBusGain             → yarn play-drum-balance:test:full
 *   kScMix (+ kScMakeupDb below)            → yarn sidechain-parity:test:full
 */
constexpr float kEnvDecayTauScale = 0.700f;
constexpr float kEnvReleaseTauScale = 0.060f;

constexpr float kPlayBusGain = 0.300f;
constexpr float kDrumBusGain = 2.440f;

constexpr float kScMakeupDb = 24.f;
constexpr float kScAttackSec = 0.005f;
constexpr float kScReleaseSec = 0.06f;

constexpr float kRazzleVibratoWet = 0.1f;
constexpr float kRazzleChorusWet = 0.5f;
constexpr float kRazzleHissGain = 0.0035f;
constexpr float kRazzleChorusBaseSec = 0.007f;
constexpr float kRazzleChorusDepthSec = 0.007f;

constexpr float kMainCompThresholdDb = -28.f;
constexpr float kMainCompRatio = 4.f;
constexpr float kMainCompKneeDb = 30.f;
constexpr float kMainCompAttackSec = 0.003f;
constexpr float kMainCompReleaseSec = 0.15f;
constexpr float kMainCompGainAttackSec = 0.008f;
constexpr float kMainCompGainReleaseSec = 0.1f;
constexpr float kMainCompMix = 0.55f;
constexpr float kMainCompSilenceFloor = 1e-4f;
constexpr float kMainCompSilenceDecay = 0.9995f;
constexpr float kSynthNoteOnFadeSec = 0.f;

/** Post-gain after ReverbSc (internal kOutputGain 0.35 in reverbsc.cpp) */
constexpr float kReverbPostGain = 1.5f;
constexpr float kReverbScLpHz = 10000.f;
/** Parallel FX return bus — see docs/parallel-fx-bus.md */
constexpr float kFxReturnCompThresholdDb = -24.f;
constexpr float kFxReturnCompRatio = 4.f;
constexpr float kFxReturnCompKneeDb = 6.f;
constexpr float kFxReturnCompAttackSec = 0.002f;
constexpr float kFxReturnCompReleaseSec = 0.08f;
constexpr float kFxReturnWetTrim = 1.4f;
/** Sidechain duck depth — yarn sidechain-parity:test:full */
constexpr float kScMix = 0.75f;
constexpr float kScTriggerFloor = 1e-5f;
constexpr float kAutowahDefaultOct = 6.f;
constexpr float kAutowahDefaultGain = 2.f;

constexpr float kDrumGains[kDrumCount] = {
    0.26f, 0.24f, 0.4f,  0.35f, 0.3f,  0.26f,
    0.3f,  0.28f, 0.26f, 0.67f, 0.42f, 0.36f,
};

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
