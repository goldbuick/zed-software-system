/**
 * ZSS DaisySP synth — see zss/README.md for module map.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

/** Shared control buffer — layout mirrors TypeScript SAB (daisycontrol.ts) */
alignas(8) double g_control[kControlLen];

int off_voices()
{
  return 0;
}
int off_drums()
{
  return kVoicesLen;
}
int off_main()
{
  return kVoicesLen + kDrumsLen;
}
int off_fx()
{
  return off_main() + kMainLen;
}
int off_voicecfg()
{
  return off_fx() + kFxLen;
}
int off_osccfg()
{
  return off_voicecfg() + kVoiceCfgLen;
}
int off_algocfg()
{
  return off_osccfg() + kOscCfgLen;
}
int off_vibrato()
{
  return off_algocfg() + kAlgoCfgLen;
}

float readctrl(int idx)
{
  return static_cast<float>(g_control[idx]);
}

float fxsendval(int group, int send_idx)
{
  return readctrl(off_fx() + group * kFxSendCount + send_idx);
}

float fxparam(int group, int param_idx)
{
  return readctrl(off_fx() + kFxGroups * kFxSendCount + group * kFxParamCount
                 + param_idx);
}
OscCfg readosccfg(int vi)
{
  const int b = off_osccfg() + vi * kOscCfgStride;
  OscCfg    c;
  c.phase         = readctrl(b + 0);
  c.width         = readctrl(b + 1);
  c.modfreq       = readctrl(b + 2);
  c.harmonicity   = readctrl(b + 3);
  c.modindex      = readctrl(b + 4);
  c.count         = readctrl(b + 5);
  c.spread        = readctrl(b + 6);
  c.partialcount  = readctrl(b + 7);
  for(int p = 0; p < 8; ++p)
  {
    c.partials[p] = readctrl(b + 8 + p);
  }
  c.modenv_a = readctrl(b + 16);
  c.modenv_d = readctrl(b + 17);
  c.modenv_s = readctrl(b + 18);
  c.modenv_r = readctrl(b + 19);
  c.modtype  = static_cast<int>(readctrl(b + 20));
  return c;
}

AlgoCfg readalgocfg(int vi)
{
  const int b = off_algocfg() + vi * kAlgoCfgStride;
  AlgoCfg   c;
  c.h1  = readctrl(b + 0);
  c.h2  = readctrl(b + 1);
  c.h3  = readctrl(b + 2);
  c.mi1 = readctrl(b + 3);
  c.mi2 = readctrl(b + 4);
  c.mi3 = readctrl(b + 5);
  c.osctype[0] = static_cast<int>(readctrl(b + 6));
  c.osctype[1] = static_cast<int>(readctrl(b + 7));
  c.osctype[2] = static_cast<int>(readctrl(b + 8));
  c.osctype[3] = static_cast<int>(readctrl(b + 9));
  for(int o = 0; o < 4; ++o)
  {
    c.env_a[o] = readctrl(b + 10 + o * 4);
    c.env_d[o] = readctrl(b + 11 + o * 4);
    c.env_s[o] = readctrl(b + 12 + o * 4);
    c.env_r[o] = readctrl(b + 13 + o * 4);
  }
  return c;
}
} // namespace zss_daisy
