import {
  SOUNDCLOUD_FORMATS_MP3,
  SOUNDCLOUD_FORMATS_OPUS_MP3,
  YTDLP_AUDIO_FORMAT,
  YTDLP_FORMAT,
  YTDLP_FORMAT_TRIES,
  buildytdlpargs,
  buildytdlpprobebatchargs,
  isstaticframevideo,
  probebatchtimeoutms,
  probeerrormessage,
  ytdlpformattriesforurl,
} from 'ops/media-queue/src/main/lib/download'

const PROBE_BATCH_CTX = {
  ytdlp: '/bin/yt-dlp',
  jspath: '/bin/deno',
  ytdlphome: '/tmp/home',
  ffdir: '/bin',
  cachedir: '/tmp/cache',
  attempt: 1,
  cookiesbrowser: '',
  url: 'https://soundcloud.com/kimpetras/sets/turn-off-the-light-9',
}

describe('static frame detection', () => {
  it('flags an album-art track and spares a real video', () => {
    // Measured off youtube: a 1080x1080 art track next to a 1920x1080 video.
    expect(isstaticframevideo(1080, 1080, 48.822)).toBe(true)
    expect(isstaticframevideo(1920, 1080, 5242.101)).toBe(false)
  })

  it('leaves audio-only sources alone', () => {
    // SoundCloud reports no video track at all, which is not a still frame --
    // the audio ladder already owns that case.
    expect(isstaticframevideo(0, 0, 0)).toBe(false)
    expect(isstaticframevideo(Number.NaN, Number.NaN, 0)).toBe(false)
  })

  it('does not guess when bitrate is missing', () => {
    expect(isstaticframevideo(1920, 1080, 0)).toBe(false)
  })
})

describe('audio-only format routing', () => {
  it('drops the video ladder for a detected static frame', () => {
    const tries = ytdlpformattriesforurl(
      'https://www.youtube.com/watch?v=LC_BUIpYIso',
      true,
    )
    expect(tries.length).toBeGreaterThan(0)
    expect(tries.every((entry) => entry.profile === 'audio')).toBe(true)
  })

  it('keeps the video ladder for a normal video', () => {
    const tries = ytdlpformattriesforurl(
      'https://www.youtube.com/watch?v=LC_BUIpYIso',
      false,
    )
    expect(tries.some((entry) => entry.profile === 'video')).toBe(true)
  })
})

describe('playlist batch metadata args', () => {
  it('reads the whole slice in one playlist pass', () => {
    const args = buildytdlpprobebatchargs(PROBE_BATCH_CTX, 5)
    // One run for the slice is ~10x faster than one probe per track, and
    // avoids the per-host throttling that timed out parallel single probes.
    expect(args).toContain('--yes-playlist')
    expect(args).not.toContain('--no-playlist')
    expect(args[args.indexOf('-I') + 1]).toBe('1:5')
    // Without --ignore-errors a DRM track aborts the run before the playable
    // tracks further down the set are ever printed.
    expect(args).toContain('--ignore-errors')
    expect(args).toContain(
      '%(id)s\t%(webpage_url)s\t%(title)s\t%(duration)s\t%(width)s\t%(height)s\t%(vbr)s',
    )
  })

  it('never asks for a zero-length slice', () => {
    const args = buildytdlpprobebatchargs(PROBE_BATCH_CTX, 0)
    expect(args[args.indexOf('-I') + 1]).toBe('1:1')
  })

  it('scales the timeout with entry count and stays bounded', () => {
    expect(probebatchtimeoutms(1)).toBeLessThan(probebatchtimeoutms(10))
    expect(probebatchtimeoutms(0)).toBe(probebatchtimeoutms(1))
    expect(probebatchtimeoutms(10_000)).toBeLessThanOrEqual(180_000)
  })
})

describe('browser cookies are youtube only', () => {
  it('sends cookies for youtube urls', () => {
    const args = buildytdlpprobebatchargs(
      { ...PROBE_BATCH_CTX, cookiesbrowser: 'chrome', url: 'https://youtu.be/a' },
      3,
    )
    expect(args).toContain('--cookies-from-browser')
    expect(args).toContain('chrome')
  })

  it('withholds cookies from soundcloud', () => {
    // Authenticated soundcloud requests drop the unencrypted preview
    // transcoding and leave only the DRM stream, so a track that plays logged
    // out fails logged in.
    const args = buildytdlpprobebatchargs(
      { ...PROBE_BATCH_CTX, cookiesbrowser: 'chrome' },
      3,
    )
    expect(args).not.toContain('--cookies-from-browser')
  })

  it('withholds cookies from soundcloud downloads too', () => {
    const args = buildytdlpargs(
      {
        ytdlp: 'yt-dlp',
        jspath: 'deno:deno',
        ytdlphome: '/tmp/ytdlp',
        ffdir: '/tmp/ff',
        cachedir: '/tmp/media',
        attempt: 1,
        cookiesbrowser: 'chrome',
        url: 'https://soundcloud.com/kimpetras/everybody-dies',
      },
      YTDLP_FORMAT_TRIES[0],
    )
    expect(args).not.toContain('--cookies-from-browser')
  })
})

describe('yt-dlp format try ladder', () => {
  it('prefers 720p video then aac audio then mp3 then opus+mp3', () => {
    expect(YTDLP_FORMAT_TRIES.map((entry) => entry.label)).toEqual([
      'video',
      'audio-aac',
      'audio-mp3',
      'audio-opus-mp3',
    ])
    expect(YTDLP_FORMAT_TRIES[0].format).toBe(YTDLP_FORMAT)
    expect(YTDLP_FORMAT_TRIES[1].format).toBe(YTDLP_AUDIO_FORMAT)
    expect(YTDLP_FORMAT_TRIES[2].soundcloudformats).toBe(SOUNDCLOUD_FORMATS_MP3)
    expect(YTDLP_FORMAT_TRIES[3].soundcloudformats).toBe(
      SOUNDCLOUD_FORMATS_OPUS_MP3,
    )
  })

  it('omits hls_aac from SoundCloud fallbacks after aac', () => {
    const fallbacks = YTDLP_FORMAT_TRIES.slice(2)
    for (let i = 0; i < fallbacks.length; i += 1) {
      expect(fallbacks[i].soundcloudformats).not.toMatch(/aac/)
    }
  })

  it('passes soundcloud formats extractor-arg on mp3 try', () => {
    const args = buildytdlpargs(
      {
        ytdlp: 'yt-dlp',
        jspath: 'deno:deno',
        ytdlphome: '/tmp/ytdlp',
        ffdir: '/tmp/ff',
        cachedir: '/tmp/media',
        attempt: 1,
        cookiesbrowser: '',
        url: 'https://soundcloud.com/example/track',
      },
      YTDLP_FORMAT_TRIES[2],
    )
    expect(args).toContain('--extractor-args')
    expect(args).toContain('soundcloud:formats=http_mp3,hls_mp3')
    expect(args).toContain('-f')
    expect(args).toContain(YTDLP_FORMAT_TRIES[2].format)
  })

  it('omits duration match-filter when allowlong is set', () => {
    const args = buildytdlpargs(
      {
        ytdlp: 'yt-dlp',
        jspath: 'deno:deno',
        ytdlphome: '/tmp/ytdlp',
        ffdir: '/tmp/ff',
        cachedir: '/tmp/media',
        attempt: 1,
        cookiesbrowser: '',
        url: 'https://youtu.be/long',
        allowlong: true,
      },
      YTDLP_FORMAT_TRIES[0],
    )
    expect(args.join(' ')).not.toMatch(/duration <=/)
  })

  it('keeps duration match-filter by default', () => {
    const args = buildytdlpargs(
      {
        ytdlp: 'yt-dlp',
        jspath: 'deno:deno',
        ytdlphome: '/tmp/ytdlp',
        ffdir: '/tmp/ff',
        cachedir: '/tmp/media',
        attempt: 1,
        cookiesbrowser: '',
        url: 'https://youtu.be/short',
      },
      YTDLP_FORMAT_TRIES[0],
    )
    expect(args).toContain('--match-filter')
    expect(args).toContain('duration <= 600')
  })

  it('caps the short axis so portrait sources still match a video format', () => {
    const branches = YTDLP_FORMAT.split('/')
    expect(branches.some((branch) => branch.includes('height<=720'))).toBe(true)
    expect(branches.some((branch) => branch.includes('width<=720'))).toBe(true)
    for (let i = 0; i < branches.length; i += 1) {
      expect(branches[i]).toMatch(/(width|height)<=720/)
    }
  })

  it('prefers DASH video+audio merges before progressive best', () => {
    // Progressive itag 18 often selects then 403s; yt-dlp will not walk `/`
    // fallbacks after a mid-download failure, so putting it first forced the
    // audio-only ladder (visualizer) for real videos like aq4G-7v-_xI.
    const branches = YTDLP_FORMAT.split('/')
    const firstdash = branches.findIndex((branch) =>
      branch.startsWith('bestvideo['),
    )
    const firstprogressive = branches.findIndex((branch) =>
      branch.startsWith('best['),
    )
    expect(firstdash).toBeGreaterThanOrEqual(0)
    expect(firstprogressive).toBeGreaterThan(firstdash)
  })

  it('matches avc1 and h264 codec namings', () => {
    expect(YTDLP_FORMAT).toContain("vcodec~='^(avc|h264)'")
    expect(YTDLP_FORMAT).toContain("acodec~='^(mp4a|aac)'")
  })

  it('reduces a yt-dlp probe failure to the reason alone', () => {
    const stderr = [
      'WARNING: [soundcloud] 254647458: hls_mp3 format not found',
      'WARNING: [soundcloud] 254647458: http_mp3 format not found',
      'ERROR: [soundcloud] 254647458: This video is DRM protected',
    ].join('\n')
    expect(probeerrormessage(stderr, 1)).toBe('this track is DRM protected')
  })

  it('rewrites yt-dlp generic "This video" for audio-only sources', () => {
    for (const [stderr, expected] of [
      ['ERROR: [soundcloud] 1: This video is private', 'this track is private'],
      [
        'ERROR: [soundcloud] 1: This video has been removed by the uploader',
        'this track has been removed by the uploader',
      ],
    ]) {
      expect(probeerrormessage(stderr, 1)).toBe(expected)
    }
    // Only the leading noun is boilerplate; mid-sentence wording is left alone.
    expect(
      probeerrormessage('ERROR: [x] 1: Requested format is not available', 1),
    ).toBe('Requested format is not available')
  })

  it('drops the report-this-issue tail and caps probe error length', () => {
    expect(
      probeerrormessage(
        'ERROR: [TikTok] 123: Unable to extract webpage video data; please report this issue on https://github.com/yt-dlp/yt-dlp/issues',
        1,
      ),
    ).toBe('Unable to extract webpage video data')
    const long = `ERROR: [x] 1: ${'y'.repeat(200)}`
    expect(probeerrormessage(long, 1).length).toBeLessThanOrEqual(90)
  })

  it('falls back to the exit status when stderr is empty', () => {
    expect(probeerrormessage('', 2)).toBe('probe failed with status 2')
    expect(probeerrormessage('   \n  ', null)).toBe(
      'probe failed with status -1',
    )
  })

  it('skips video tries for YouTube Music urls', () => {
    const tries = ytdlpformattriesforurl(
      'https://music.youtube.com/watch?v=abc123',
    )
    expect(tries.map((entry) => entry.label)).toEqual([
      'audio-aac',
      'audio-mp3',
      'audio-opus-mp3',
    ])
    expect(
      ytdlpformattriesforurl('https://www.youtube.com/watch?v=abc123'),
    ).toBe(YTDLP_FORMAT_TRIES)
  })
})
