export type TVSINK_ASSERT_RESULT = {
  ok: boolean
  videowidth: number
  videocount: number
  ready: number
  audiocount: number
  errormessage: string
}

/** DOM-only board TV sink checks (hidden decode video in document.body). */
export async function evaluatetvsink(page: {
  evaluate: <T>(fn: () => T) => Promise<T>
}): Promise<TVSINK_ASSERT_RESULT> {
  return page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll('video'))
    const audios = Array.from(document.querySelectorAll('audio'))
    for (let i = 0; i < videos.length; ++i) {
      const video = videos[i]
      video.muted = false
      void video.play().catch(() => {
        // autoplay may still need a user gesture
      })
    }
    for (let i = 0; i < audios.length; ++i) {
      const audio = audios[i]
      audio.muted = false
      void audio.play().catch(() => {
        // board TV audio uses a separate element from the muted decode video
      })
    }
    let best: HTMLVideoElement | undefined
    let bestwidth = 0
    for (let i = 0; i < videos.length; ++i) {
      const video = videos[i]
      if (video.videoWidth > bestwidth) {
        bestwidth = video.videoWidth
        best = video
      }
    }
    if (!best) {
      return {
        ok: false,
        videowidth: 0,
        videocount: videos.length,
        ready: 0,
        audiocount: audios.length,
        errormessage: 'no video element',
      }
    }
    const ready = best.readyState
    const ok = bestwidth > 0 && ready >= 2
    return {
      ok,
      videowidth: bestwidth,
      videocount: videos.length,
      ready,
      audiocount: audios.length,
      errormessage: ok ? '' : `videoWidth=${bestwidth} readyState=${ready}`,
    }
  })
}

export async function waittvsink(
  page: { evaluate: <T>(fn: () => T) => Promise<T> },
  timeoutms: number,
  label: string,
): Promise<TVSINK_ASSERT_RESULT> {
  const deadline = Date.now() + timeoutms
  let last: TVSINK_ASSERT_RESULT = {
    ok: false,
    videowidth: 0,
    videocount: 0,
    ready: 0,
    audiocount: 0,
    errormessage: 'timeout',
  }
  while (Date.now() < deadline) {
    last = await evaluatetvsink(page)
    if (last.ok) {
      return last
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${label}: ${last.errormessage}`)
}
