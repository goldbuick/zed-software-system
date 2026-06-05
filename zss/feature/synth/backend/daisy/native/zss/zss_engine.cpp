/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

ZssEngine g_engine;
void initvoice(ZssVoice& v, float sr)
{
  v.synthosc.Init(sr);
  v.synthmod.Init(sr);
  v.sparklemod.Init(sr);
  v.sparklecar.Init(sr);
  v.dootosc.Init(sr);
  for(int o = 0; o < 4; ++o)
  {
    v.algoops[o].Init(sr);
    v.algoenvs[o].Init(sr);
  }
  v.voiceenv.init(sr);
  v.dootenv.Init(sr);
  v.dootenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
  v.dootenv.SetTime(ADSR_SEG_DECAY, 0.4f);
  v.dootenv.SetSustainLevel(0.01f);
  v.dootenv.SetTime(ADSR_SEG_RELEASE, 1.4f);
  v.sparkleenv.Init(sr);
  v.sparkleenv.SetTime(ADSR_SEG_ATTACK, 0.001f);
  v.sparkleenv.SetTime(ADSR_SEG_DECAY, 1.4f);
  v.sparkleenv.SetSustainLevel(0.f);
  v.sparkleenv.SetTime(ADSR_SEG_RELEASE, 0.321f);
  v.algooutenv.Init(sr);
  v.modenv.init(sr);
  v.modenv.setparams(0.01f, 0.01f, 1.f, 0.5f);
  v.noiserng = (0x6d2b79f5u + 7919u) >> 0;
  v.stringvoice.Init(sr);
  v.stringvoicepreset = -1;
  v.stringlp.Init(sr);
  v.stringbodylo.Init(sr);
  v.stringbodyhi.Init(sr);
  v.stringbowhp.Init();
  v.stringbowhp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  v.stringviblfo.Init(sr);
  v.stringpwmlfo.Init(sr);
  v.drip.Init(sr, 0.01f);
  v.modalvoice.Init(sr);
  v.modalvoice.SetStructure(0.5f);
  v.modalvoice.SetBrightness(0.5f);
  v.modalvoice.SetDamping(0.5f);
  v.modalvoice.SetAccent(0.8f);
}

void initdaisydrums(float sr)
{
  g_engine.tom_drum.Init(sr);
  g_engine.tom_drum.SetFreq(90.f);
  g_engine.tom_drum.SetDecay(0.35f);
  g_engine.tom_drum.SetTone(0.5f);
  g_engine.tom_drum.SetFmEnvelopeAmount(0.6f);
  g_engine.tom_drum.SetAccent(0.8f);

  g_engine.bass_drum.Init(sr);
  g_engine.bass_drum.SetFreq(50.f);
  g_engine.bass_drum.SetDecay(0.5f);
  g_engine.bass_drum.SetTone(0.4f);
  g_engine.bass_drum.SetAccent(0.9f);
}

void initengine(float sr)
{
  g_engine.sample_rate = sr;
  initnoisetables();
  for(int i = 0; i < kVoiceCount; ++i)
  {
    initvoice(g_engine.voices[i], sr);
  }
  g_engine.drum_whitenoise.Init();
  initdaisydrums(sr);
  initmainchain(sr);
  initfxreturnchain(sr);
  initrazzlechain(sr);
  for(int d = 0; d < kDrumCount; ++d)
  {
    g_engine.drumoscA[d].Init(sr);
    g_engine.drumoscB[d].Init(sr);
    g_engine.drums[d].hp.Init();
    g_engine.drums[d].hp.SetFilterMode(OnePole::FILTER_MODE_HIGH_PASS);
  }
  for(int f = 0; f < kFxGroups; ++f)
  {
    ZssFxGroup& fx = g_engine.fx[f];
    fx.decimator.Init();
    fx.overdrive.Init();
    fx.autowah.Init(sr);
    fx.autofilter_svf.Init(sr);
    fx.autofilter_phasor.Init(sr);
    fx.echo_line.Init();
    initreverbgroup(fx, sr);
    refreshfxderived(f);
  }
  g_engine.fxvibratolfo.Init(sr);
  g_engine.main_dcblock.Init(sr);
  g_engine.ready = true;
}

float processvoice(int vi, float vstart[kVibratoGroups], float vend[kVibratoGroups],
                   float vpeak[kVibratoGroups], float vfreq[kVibratoGroups])
{
  const int base = off_voices() + vi * kVoiceStride;
  const int cfg  = off_voicecfg() + vi * kVoiceCfgStride;

  float freq   = readctrl(base + 0);
  bool  gate   = readctrl(base + 1) > 0.5f;
  int   type   = static_cast<int>(readctrl(base + 2));
  int   algo   = static_cast<int>(readctrl(base + 3));
  float detune = readctrl(base + 4);
  int   osctype = static_cast<int>(readctrl(base + 5));

  float atk = readctrl(cfg + 0), dec = readctrl(cfg + 1);
  float sus = readctrl(cfg + 2), rel = readctrl(cfg + 3);
  float port = readctrl(cfg + 4), vol_db = readctrl(cfg + 5);

  applyvoiceenv(g_engine.voices[vi], type, atk, dec, sus, rel);

  ZssVoice& v = g_engine.voices[vi];
  float     out = 0.f;

  if(type == kSynth)
  {
    const float notefreq  = freq > 0.f ? freq : 440.f;
    const float striketag = detune;
    const bool  rising    = gate && !v.synthgateprev;
    const bool  notestrike =
      gate && striketag > 0.5f && striketag != v.synthstriketag;
    if(rising)
    {
      v.voicephasestep = 0.f;
      v.synthosc.Reset(0.f);
      v.synthmod.Reset(0.f);
    }
    else if(notestrike)
    {
      v.synthmod.Reset(0.f);
    }
    if(rising || notestrike)
    {
      v.voiceenv.retrigger();
      v.modenv.retrigger();
      v.noteonfade = 0.f;
    }
    if(gate && striketag > 0.5f)
    {
      v.synthstriketag = striketag;
    }
    if(gate)
    {
      v.synthschedhz = notefreq;
    }
    v.synthgateprev = gate;
    float hz     = glidefreq(v, vi, notefreq, kSynth, port);
    float envout = v.voiceenv.process(gate);
    v.lastenv    = envout;
    out          = synthsource(v, vi, hz, gate, 0.f, osctype, vfreq) * envout;
    if(gate && kSynthNoteOnFadeSec > 0.f)
    {
      const float fadeinc = 1.f / std::max(1.f, kSynthNoteOnFadeSec * g_engine.sample_rate);
      if(v.noteonfade < 1.f)
      {
        v.noteonfade = std::min(1.f, v.noteonfade + fadeinc);
      }
      out *= v.noteonfade;
    }
    else
    {
      v.noteonfade = 0.f;
    }
  }
  else if(type >= kRetroNoise && type <= kMetallicNoise)
  {
    float envout = v.voiceenv.process(gate);
    v.lastenv    = envout;
    out          = noisevoice(v, vi, type, freq, gate, envout);
  }
  else if(type == kHollowNoise || type == kWhiteNoise)
  {
    float envout = v.voiceenv.process(gate);
    v.lastenv    = envout;
    out          = noisevoice(v, vi, type, freq, gate, envout);
  }
  else if(type == kBells)
  {
    float hz      = detunedhz(vi, freq, detune, vfreq);
    if(hz <= 0.f)
    {
      hz = 440.f;
    }
    bool trigger = gate && !v.bellgateprev;
    v.bellgateprev = gate;
    v.modalvoice.SetFreq(hz);
    v.modalvoice.SetSustain(gate);
    float body    = v.modalvoice.Process(trigger);
    float sparkhz = hz * 4.f;
    v.sparklemod.SetFreq(sparkhz * 5.1f);
    v.sparklemod.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklemod.SetAmp(1.f);
    float sparkmod = v.sparklemod.Process() * 32.f;
    v.sparklecar.SetFreq(sparkhz + sparkmod * 0.002f);
    v.sparklecar.SetWaveform(Oscillator::WAVE_SIN);
    v.sparklecar.SetAmp(1.f);
    float sparkle = v.sparklecar.Process() * v.sparkleenv.Process(gate);
    out           = (body + sparkle * 0.15f) * 0.35f;
    v.lastenv     = std::fabs(out);
  }
  else if(type == kDoot)
  {
    out       = dootvoice(v, freq, gate);
    v.lastenv = std::fabs(out);
  }
  else if(type == kAlgoSynth)
  {
    out       = algovoice(v, vi, freq, gate, algo, vfreq);
    v.lastenv = std::fabs(out);
  }
  else if(type == kStringVoice)
  {
    float hz      = detunedhz(vi, freq > 0.f ? freq : 440.f, 0.f, vfreq);
    bool  trigger = gate && !v.stringgateprev;
    v.stringgateprev = gate;
    applystringvoicepreset(v, algo == 0 ? 0 : 1);
    if(algo == 0)
    {
      float envout = v.voiceenv.process(gate);
      float detunecents, pwmdepth, vibcents, filterscale;
      applystringensembleparams(v, cfg, detunecents, pwmdepth, vibcents, filterscale);
      out = stringmachinevoice(v, hz, envout, detunecents, pwmdepth, vibcents,
                               filterscale)
            * envout;
      out *= dbtoamp(vol_db) * kStringMachineGain;
      v.lastenv = envout;
      return out;
    }
    applypluckparams(v, cfg);
    v.stringvoice.SetFreq(hz);
    v.stringvoice.SetSustain(false);
    if(trigger)
    {
      v.stringvoice.Reset();
    }
    out = v.stringvoice.Process(trigger);
    out *= dbtoamp(vol_db) * kStringPluckGain;
    v.lastenv = std::fabs(out);
    return out;
  }
  else if(type == kDripVoice)
  {
    bool trigger = gate && !v.dripgateprev;
    v.dripgateprev = gate;
    out            = v.drip.Process(trigger) * dbtoamp(vol_db);
    v.lastenv      = std::fabs(out);
    return out;
  }
  else if(type == kWindVoice)
  {
    float hz = freq > 0.f ? freq : 440.f;
    out      = windvoice(v, hz, gate, algo, cfg);
    return out * dbtoamp(vol_db);
  }
  else if(type == kPianoVoice)
  {
    float hz  = freq > 0.f ? freq : 440.f;
    float vel = detune > 0.f ? detune : 0.75f;
    out       = pianovoice(v, hz, gate, algo, cfg, vel);
    return out * dbtoamp(vol_db);
  }
  else if(type == kTimpaniVoice)
  {
    float hz  = freq > 0.f ? freq : 110.f;
    float vel = detune > 0.f ? detune : 0.75f;
    out       = timpanivoice(v, hz, gate, cfg, vel);
    return out * dbtoamp(vol_db);
  }
  else if(type == kBowedVoice)
  {
    float hz  = freq > 0.f ? freq : 440.f;
    float vel = detune > 0.f ? detune : 0.75f;
    out       = bowedvoice(v, vi, hz, gate, algo, cfg, port, vel);
    return out * dbtoamp(vol_db);
  }
  else if(type == kGuitarVoice)
  {
    float hz  = freq > 0.f ? freq : 220.f;
    float vel = detune > 0.f ? detune : 0.75f;
    if(v.guitarpreset != algo)
    {
      v.guitarpreset = algo;
      v.guitarprev[0] = v.guitarprev[1] = v.guitarprev[2] = v.guitarprev[3] = -1.f;
      v.stringvoicepreset = -1;
    }
    out = guitarvoice(v, hz, gate, algo, cfg, vel);
    return out * dbtoamp(vol_db);
  }
  else if(type == kOrganVoice)
  {
    float hz = freq > 0.f ? freq : 440.f;
    out      = organvoice(v, hz, gate, algo, cfg);
    return out * dbtoamp(vol_db);
  }
  else
  {
    float envout = v.voiceenv.process(gate);
    v.lastenv    = envout;
    out          = synthsource(v, vi, freq, gate, 0.f, osctype, vfreq) * envout;
  }

  return out * dbtoamp(vol_db);
}
} // namespace zss_daisy
