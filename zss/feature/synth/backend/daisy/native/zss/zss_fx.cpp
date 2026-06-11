/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

// --- Parallel FX bus (dry + Σ send·wet); vibrato is pitch-only, not in wet sum
// ---

float reverbscfeedbackfromdecay(float decay) {
  if (decay <= 0.05f) {
    decay = 2.5f;
  }
  decay = clampf(decay, 0.2f, 12.f);
  const float fb = 0.75f + (1.f - std::exp(-decay / 5.5f)) * 0.23f;
  return std::min(fb, 0.98f);
}

void initreverbgroup(ZssFxGroup& fx, float sr) {
  fx.reverbsc.Init(sr);
  fx.reverbsc.SetLpFreq(kReverbScLpHz);
  fx.reverbsc.SetFeedback(reverbscfeedbackfromdecay(2.5f));
  fx.rev_predelay_fb = 0.f;
  fx.rev_predelay_len = 0;
  fx.rev_predelay_line.setlen(1);
}

void refreshfxderived(int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  float delaysec = fxparam(group, kFxEchoDelay);
  if (delaysec <= 0.0001f) {
    delaysec = 0.22f;
  }
  fx.echo_delay =
      std::max(1, static_cast<int>(delaysec * g_engine.sample_rate + 0.5f));
  if (fx.echo_delay >= kEchoBufLen) {
    fx.echo_delay = kEchoBufLen - 1;
  }
  fx.echo_feedback = clampf(fxparam(group, kFxEchoFeedback), 0.f, 0.95f);
  fx.echo_line.SetDelay(static_cast<float>(fx.echo_delay));
  float decay = fxparam(group, kFxReverbDecay);
  fx.reverbsc.SetFeedback(reverbscfeedbackfromdecay(decay));
  float pd = fxparam(group, kFxReverbPredelay);
  int pdlen =
      pd <= 0.0001f
          ? 0
          : std::max(1, static_cast<int>(pd * g_engine.sample_rate + 0.5f));
  if (pdlen != fx.rev_predelay_len) {
    fx.rev_predelay_len = pdlen;
    if (pdlen <= 0) {
      fx.rev_predelay_line.setlen(1);
    } else {
      fx.rev_predelay_line.setlen(pdlen);
    }
    fx.rev_predelay_fb = 0.f;
  }
}

float fxfcrush(float x, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  int rate = static_cast<int>(fxparam(group, kFxFcRate));
  if (rate <= 1) {
    rate = 1;
  }
  fx.decimator.SetDownsampleFactor(static_cast<float>(rate));
  float crush = clampf((static_cast<float>(rate) - 1.f) / 31.f, 0.f, 1.f);
  fx.decimator.SetBitcrushFactor(crush);
  fx.decimator.SetSmoothCrushing(true);
  return fx.decimator.Process(x);
}

float fxecho(float x, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  float delayed = fx.echo_line.Read();
  float input = x + delayed * fx.echo_feedback;
  input = std::tanh(input);
  fx.echo_line.Write(input);
  return delayed;
}

float fxreverbinput(float x, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  if (fx.rev_predelay_len <= 0) {
    return x;
  }
  const float pdin = x + fx.rev_predelay_fb * 0.35f;
  const float pdout = fx.rev_predelay_line.dl(pdin, 0.35f);
  fx.rev_predelay_fb = pdout;
  return pdout;
}

float fxreverb(float x, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  const float src = fxreverbinput(x, group);
  float outl = 0.f;
  float outr = 0.f;
  if (fx.reverbsc.Process(src, src, &outl, &outr) != 0) {
    return 0.f;
  }
  const float wet = (outl + outr) * 0.5f;
  return std::tanh(wet * kReverbPostGain);
}

float fxautofilterbus(float x, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  float freq = fxparam(group, kFxAutofilterFreq);
  if (freq <= 0.f) {
    freq = 1.f;
  }
  float depth = fxparam(group, kFxAutofilterDepth);
  if (depth <= 0.f) {
    depth = 0.5f;
  }
  float base = fxparam(group, kFxAutofilterBase);
  if (base <= 0.f) {
    base = 200.f;
  }
  float oct = fxparam(group, kFxAutofilterOct);
  if (oct <= 0.f) {
    oct = 4.f;
  }
  float q = fxparam(group, kFxAutofilterQ);
  if (q <= 0.f) {
    q = 1.f;
  }
  fx.autofilter_phasor.SetFreq(freq);
  float lfo = fx.autofilter_phasor.Process();
  float maxhz = base * std::pow(2.f, oct);
  if (maxhz > g_engine.sample_rate * 0.5f) {
    maxhz = g_engine.sample_rate * 0.5f;
  }
  float unipolar = lfo * depth + (1.f - depth) * 0.5f;
  float cutoff = base + (maxhz - base) * unipolar;
  if (cutoff < 20.f) {
    cutoff = 20.f;
  }
  fx.autofilter_svf.SetFreq(cutoff);
  fx.autofilter_svf.SetRes(clampf(q / 10.f, 0.01f, 1.f));
  fx.autofilter_svf.Process(x);
  return fx.autofilter_svf.Band() - x;
}

float autowahinputboost(float sensitivitydb) {
  float gain = std::pow(10.f, sensitivitydb / 20.f);
  if (gain <= 0.f) {
    return 1.f;
  }
  return 1.f / gain;
}

float fxautowahbus(float x, int group) {
  if (!std::isfinite(x)) {
    return 0.f;
  }
  ZssFxGroup& fx = g_engine.fx[group];
  float octaves = fxparam(group, kFxAutowahOct);
  if (octaves <= 0.f) {
    octaves = kAutowahDefaultOct;
  }
  float sensitivity = fxparam(group, kFxAutowahSens);
  float gaindb = fxparam(group, kFxAutowahGain);

  float input = x * autowahinputboost(sensitivity);
  fx.autowah.SetWah(clampf(octaves / 6.f, 0.f, 1.f));
  fx.autowah.SetLevel(clampf(dbtoamp(gaindb) / 4.f, 0.f, 1.f));
  fx.autowah.SetDryWet(100.f);
  float wet = fx.autowah.Process(input);
  if (!std::isfinite(wet)) {
    return 0.f;
  }
  return wet - x;
}

bool fxgrouphasactivesends(int group) {
  for (int s = 0; s < kFxSendCount; ++s) {
    if (fxsendval(group, s) > 0.0001f) {
      return true;
    }
  }
  return false;
}

float compressorskneedb(float dbover, float ratio, float kneedb);

void initfxreturnchain(float sr) {
  g_engine.fx_return_attack_coef =
      1.f - std::exp(-1.f / (kFxReturnCompAttackSec * sr));
  g_engine.fx_return_release_coef =
      1.f - std::exp(-1.f / (kFxReturnCompReleaseSec * sr));
  for (int f = 0; f < kFxGroups; ++f) {
    g_engine.fx[f].return_comp_env = 0.f;
  }
}

float fxreturncompress(float wet_sum, int group) {
  ZssFxGroup& fx = g_engine.fx[group];
  float ax = std::fabs(wet_sum);
  float coef = (ax > fx.return_comp_env) ? g_engine.fx_return_attack_coef
                                         : g_engine.fx_return_release_coef;
  fx.return_comp_env += (ax - fx.return_comp_env) * coef;
  const float thresh = std::pow(10.f, kFxReturnCompThresholdDb / 20.f);
  if (fx.return_comp_env <= thresh) {
    return wet_sum;
  }
  float dbover = 20.f * std::log10(fx.return_comp_env / thresh);
  float reduced =
      compressorskneedb(dbover, kFxReturnCompRatio, kFxReturnCompKneeDb);
  float gain = std::pow(10.f, -reduced / 20.f);
  return wet_sum * gain;
}

float applyfxgroup(float sig, int group) {
  if (!fxgrouphasactivesends(group)) {
    return sig;
  }
  refreshfxderived(group);
  const float dry = sig;
  float s0 = fxsendval(group, kFxFc);
  float s1 = fxsendval(group, kFxEcho);
  float s2 = fxsendval(group, kFxReverb);
  float s3 = fxsendval(group, kFxAutofilter);
  float s5 = fxsendval(group, kFxDistort);
  float s6 = fxsendval(group, kFxAutowah);
  float wet_sum = 0.f;
  if (s0 > 0.f) {
    float wet0 = fxfcrush(dry, group);
    wet_sum += s0 * (wet0 - dry);
  }
  if (s1 > 0.f) {
    float wet1 = fxecho(dry, group);
    wet_sum += s1 * wet1;
  }
  if (s2 > 0.f) {
    float wet2 = fxreverb(dry, group);
    wet_sum += s2 * wet2;
  }
  if (s3 > 0.f) {
    wet_sum += s3 * fxautofilterbus(dry, group);
  }
  if (s5 > 0.f) {
    float amt = fxparam(group, kFxDistortion);
    if (amt <= 0.f) {
      amt = 0.4f;
    }
    g_engine.fx[group].overdrive.SetDrive(clampf(amt, 0.f, 1.f));
    float wet5 = g_engine.fx[group].overdrive.Process(dry * 3.f);
    wet_sum += s5 * (wet5 - dry);
  }
  if (s6 > 0.f) {
    wet_sum += s6 * fxautowahbus(dry, group);
  }
  wet_sum *= kFxReturnWetTrim;
  wet_sum = fxreturncompress(wet_sum, group);
  return dry + wet_sum;
}
} // namespace zss_daisy
