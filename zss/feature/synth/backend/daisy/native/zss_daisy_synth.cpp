/**
 * ZSS DaisySP synth — WASM entry points.
 *
 * Implementation is split under native/zss/ by DaisySP category:
 *   control, synthesis (osc/voice), drums, effects, dynamics (main bus).
 * See native/zss/README.md for the module map.
 *
 * Control layout: wasmsabchannels.ts / daisycontrol.ts
 */
#ifdef __arm__
#undef __arm__
#endif

#include <cmath>
#include <cstring>

#include "zss/zss_config.h"
#include "zss/zss_internal.h"

using zss_daisy::g_control;
using zss_daisy::g_engine;
using zss_daisy::initengine;
using zss_daisy::kControlLen;
using zss_daisy::off_main;
using zss_daisy::processvoice;
using zss_daisy::readbgplayvolume;
using zss_daisy::readctrl;
using zss_daisy::readmainvolume;
using zss_daisy::readttsvolume;
using zss_daisy::readvibratosab;

extern "C" {

void zss_init(float sample_rate)
{
  std::memset(g_control, 0, sizeof(g_control));
  g_control[off_main()]     = 80.0;
  g_control[off_main() + 1] = 100.0;
  g_control[off_main() + 2] = 25.0;
  g_control[off_main() + 3] = 0.0;
  initengine(sample_rate > 0.f ? sample_rate : 44100.f);
  g_engine.cached_mainvol = readmainvolume();
  g_engine.cached_bggain    = readbgplayvolume();
  g_engine.cached_ttsgain   = readttsvolume();
  g_engine.cached_mainraw = 80.f;
  g_engine.cached_bgraw     = 100.f;
  g_engine.cached_ttsraw    = 25.f;
}

double* zss_control_ptr()
{
  return g_control;
}

int zss_control_len()
{
  return kControlLen;
}

/** 2 = manual delay-line razzle (post–DaisySP Chorus) */
float zss_razzle_tag()
{
  return 2.f;
}

void zss_process(float* out, int frames, const float* tts_in)
{
  using namespace zss_daisy;

  if(!g_engine.ready)
  {
    std::memset(out, 0, frames * sizeof(float));
    return;
  }

  float vstart[kVibratoGroups], vend[kVibratoGroups], vpeak[kVibratoGroups],
        vfreq[kVibratoGroups];
  float epoch = 0.f;
  readvibratosab(&epoch, vstart, vend, vpeak, vfreq);

  float mainraw = readctrl(off_main());
  float bgraw     = readctrl(off_main() + 1);
  float ttsraw    = readctrl(off_main() + 2);
  if(mainraw != g_engine.cached_mainraw || bgraw != g_engine.cached_bgraw)
  {
    g_engine.cached_mainraw = mainraw;
    g_engine.cached_bgraw     = bgraw;
    g_engine.cached_mainvol = mainraw <= 0.001f ? 0.f : readmainvolume();
    g_engine.cached_bggain    = readbgplayvolume();
  }
  if(ttsraw != g_engine.cached_ttsraw)
  {
    g_engine.cached_ttsraw  = ttsraw;
    g_engine.cached_ttsgain = readttsvolume();
  }

  for(int f = 0; f < frames; ++f)
  {
    ++g_engine.sampleclock;
    updateplayvibratodepth(vstart, vend, vpeak);

    for(int d = 0; d < kDrumCount; ++d)
    {
      const uint32_t strike = static_cast<uint32_t>(readctrl(off_drums() + d));
      if(strike != g_engine.drums[d].prev_strike)
      {
        retriggerdrum(d, readctrl(off_drums() + kDrumCount + d));
        g_engine.drums[d].prev_strike = strike;
      }
    }

    float play0 = 0.f, play1 = 0.f, bg = 0.f;
    for(int vi = 0; vi < kVoiceCount; ++vi)
    {
      float sample = processvoice(vi, vstart, vend, vpeak, vfreq);
      if(vi < 2)
      {
        play0 += sample;
      }
      else if(vi < kPlayVoiceCount)
      {
        play1 += sample;
      }
      else
      {
        bg += sample;
      }
    }

    float drums = drumsout();
    float playfx = applyfxgroup(play0, 0) + applyfxgroup(play1, 1);
    float bgfx   = applyfxgroup(bg, 2);

    float ttssample = 0.f;
    if(tts_in != nullptr && g_engine.cached_ttsgain > 0.f)
    {
      ttssample = tts_in[f] * g_engine.cached_ttsgain;
    }

    float key = sidechainkey(bg * kVoiceOutGain * g_engine.cached_bggain, ttssample,
                             g_engine.drumsidechain);
    sidechainupdate(key);
    float duck = sidechaingain();
    g_engine.debug_duck_gain = duck;

    float playbus = playfx * duck * kVoiceOutGain * kPlayBusGain;
    float bgbus   = bgfx * kVoiceOutGain * g_engine.cached_bggain;
    float drumbus = drums * kDrumBusGain;
    float melodic = playbus + bgbus + ttssample;
    float dry     = melodic + drumbus;
    g_engine.debug_dry_peak = std::fabs(dry);

    float comp = maincompressor(dry);
    float razz     = applyrazzle(comp);
    float x        = razz * g_engine.cached_mainvol;
    float final    = g_engine.main_dcblock.Process(x);
    if(!std::isfinite(final))
    {
      final = 0.f;
    }
    out[f] = clampf(final, -1.f, 1.f);
  }
}

} // extern "C"
