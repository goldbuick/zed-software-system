/**
 * Internal API shared across ZSS Daisy synth translation units.
 */
#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>

#include "daisysp.h"
#include "reverbsc.h"
#include "zss_config.h"
#include "zss_math.h"
#include "zss_types.h"

using namespace daisysp;

namespace zss_daisy {

extern double g_control[kControlLen];

int off_voices();
int off_drums();
int off_main();
int off_fx();
int off_voicecfg();
int off_osccfg();
int off_algocfg();
int off_vibrato();

float readctrl(int idx);
float fxsendval(int group, int send_idx);
float fxparam(int group, int param_idx);

void initnoisetables();
NoiseMeta noisemetafor(int noisetype);
const float *noiseforvoice(int noisetype);
uint32_t noiseprngnext(uint32_t state, float *sample);

OscCfg readosccfg(int vi);
AlgoCfg readalgocfg(int vi);
void readvibratosab(float *epoch, float start[kVibratoGroups],
                    float end[kVibratoGroups], float peak[kVibratoGroups],
                    float freq[kVibratoGroups]);

int voicefxgroup(int vi);
float playtimesec();
void updateplayvibratodepth(float vstart[kVibratoGroups],
                            float vend[kVibratoGroups],
                            float vpeak[kVibratoGroups]);
float detunedhz(int vi, float freq, float detune, float vfreq[kVibratoGroups]);
float glidefreq(ZssVoice &v, int vi, float target, int type, float port);
void applyvoiceenv(ZssVoice &v, int type, float a, float d, float s, float r);

float voiceenvlevel(ZssVoice &v, int type);
float oscbasicwave(Oscillator &o, int wavetype, float hz, float amp);
float algopwave(Oscillator &o, int wavetype, float hz);

float synthsource(ZssVoice &v, int vi, float freq, bool gate, float detune,
                  int osctype, float vfreq[kVibratoGroups]);
float dootvoice(ZssVoice &v, float freq, bool gate);
float algovoice(ZssVoice &v, int vi, float freq, bool gate, int algo,
                float vfreq[kVibratoGroups]);
float noisevoice(ZssVoice &v, int vi, int noisetype, float freq, bool gate,
                 float envout);
float stringbownoisesample(ZssVoice &v);
void applypluckparams(ZssVoice &v, int cfg);
void applystringensembleparams(ZssVoice &v, int cfg, float &detunecents,
                               float &pwmdepth, float &vibcents,
                               float &filterscale);
void applystringvoicepreset(ZssVoice &v, int algo);
float stringmachinevoice(ZssVoice &v, float hz, float envout, float detunecents,
                         float pwmdepth, float vibcents, float filterscale);

float drumsout();
void retriggerdrum(int i, float dursec);

float applyfxgroup(float sig, int group);
void refreshfxderived(int group);

float readmainvolume();
float readbgplayvolume();
float readttsvolume();
float sidechainkey(float bg, float tts, float drumtap);
void sidechainupdate(float signal);
float sidechaingain();
float maincompressor(float x);
float applyrazzle(float input);
float compressorskneedb(float dbover, float ratio, float kneedb);

void initmainchain(float sr);
void initfxreturnchain(float sr);
void initrazzlechain(float sr);
void initreverbgroup(ZssFxGroup &fx, float sr);

void initengine(float sr);
float processvoice(int vi, float vstart[kVibratoGroups],
                   float vend[kVibratoGroups], float vpeak[kVibratoGroups],
                   float vfreq[kVibratoGroups]);

} // namespace zss_daisy
