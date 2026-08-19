import {
  SOUNDCLOUD_FORMATS_MP3,
  SOUNDCLOUD_FORMATS_OPUS_MP3,
  YTDLP_AUDIO_FORMAT,
  YTDLP_FORMAT,
  YTDLP_FORMAT_TRIES,
  buildytdlpargs,
} from 'ops/media-queue/src/main/lib/download'

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
})
