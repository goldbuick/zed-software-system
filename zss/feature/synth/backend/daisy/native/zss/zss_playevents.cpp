/**
 * Live #play / #bgplay event ring.
 * Sample rules match zss/feature/synth/backend/wasm/playevents.ts.
 */
#ifdef __arm__
#undef __arm__
#endif

#include "zss_internal.h"

namespace zss_daisy {

namespace {

bool seenevent(double id) {
  for (int i = 0; i < g_engine.playappliedn; ++i) {
    if (g_engine.playapplied[i] == id) {
      return true;
    }
  }
  return false;
}

void rememberevent(double id) {
  if (g_engine.playappliedn < kPlayAppliedCap) {
    g_engine.playapplied[g_engine.playappliedn] = id;
    g_engine.playappliedn += 1;
    return;
  }
  for (int i = 1; i < kPlayAppliedCap; ++i) {
    g_engine.playapplied[i - 1] = g_engine.playapplied[i];
  }
  g_engine.playapplied[kPlayAppliedCap - 1] = id;
}

void applyoneevent(int slot) {
  const int kind = static_cast<int>(readctrl(slot + 0));
  const int chan = static_cast<int>(readctrl(slot + 1));
  const float param = readctrl(slot + 3);
  const double noteid = g_control[slot + 4];
  const float strike = readctrl(slot + 6);

  if (kind == kPlayEventNoteOn) {
    if (chan < 0 || chan >= kVoiceCount) {
      return;
    }
    PlayLatch& latch = g_engine.playlatch[chan];
    latch.live = true;
    latch.gate = true;
    latch.freq = param;
    latch.strike = strike;
    latch.noteid = noteid;
    return;
  }

  if (kind == kPlayEventNoteOff) {
    if (chan < 0 || chan >= kVoiceCount) {
      return;
    }
    PlayLatch& latch = g_engine.playlatch[chan];
    if (!latch.live || latch.noteid != noteid) {
      return;
    }
    latch.gate = false;
    return;
  }

  if (kind == kPlayEventDrum) {
    if (chan < 0 || chan >= kDrumCount) {
      return;
    }
    retriggerdrum(chan, param);
  }
}

} // namespace

void compactplayapplied() {
  const int base = off_playevents();
  int count = static_cast<int>(readctrl(base + 1));
  if (count < 0) {
    count = 0;
  }
  if (count > kPlayRingCap) {
    count = kPlayRingCap;
  }
  int write = 0;
  for (int i = 0; i < g_engine.playappliedn; ++i) {
    const double id = g_engine.playapplied[i];
    bool keep = false;
    for (int j = 0; j < count; ++j) {
      const int slot = base + kPlayRingHeader + j * kPlayEventStride;
      if (g_control[slot + 5] == id) {
        keep = true;
        break;
      }
    }
    if (keep) {
      g_engine.playapplied[write] = id;
      write += 1;
    }
  }
  g_engine.playappliedn = write;
}

void syncplaygeneration() {
  const double gen = g_control[off_playevents()];
  if (gen == g_engine.playringgen) {
    return;
  }
  g_engine.playringgen = gen;
  g_engine.playappliedn = 0;
  for (int i = 0; i < kVoiceCount; ++i) {
    g_engine.playlatch[i].live = false;
    g_engine.playlatch[i].gate = false;
  }
}

void applydueplayevents() {
  const int base = off_playevents();
  int count = static_cast<int>(readctrl(base + 1));
  if (count < 0) {
    count = 0;
  }
  if (count > kPlayRingCap) {
    count = kPlayRingCap;
  }
  const double epoch = g_control[off_vibrato()];
  const double t =
      epoch + static_cast<double>(g_engine.sampleclock) / g_engine.sample_rate;
  for (int i = 0; i < count; ++i) {
    const int slot = base + kPlayRingHeader + i * kPlayEventStride;
    const double id = g_control[slot + 5];
    if (seenevent(id)) {
      continue;
    }
    const double when = g_control[slot + 2];
    if (when > t) {
      continue;
    }
    rememberevent(id);
    applyoneevent(slot);
  }
}

bool voicegateopen(int vi) {
  if (vi < 0 || vi >= kVoiceCount) {
    return false;
  }
  const PlayLatch& latch = g_engine.playlatch[vi];
  if (latch.live) {
    return latch.gate;
  }
  return readctrl(off_voices() + vi * kVoiceStride + 1) > 0.5f;
}

void applyplayvoicelatch(int vi, float* freq, bool* gate, float* detune) {
  if (vi < 0 || vi >= kVoiceCount) {
    return;
  }
  const PlayLatch& latch = g_engine.playlatch[vi];
  if (!latch.live) {
    return;
  }
  *freq = latch.freq;
  *gate = latch.gate;
  *detune = latch.strike;
}

} // namespace zss_daisy
