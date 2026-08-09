'use strict'

const WHIP_PORT = 8889
const RTSP_PORT = 8554
const AUTH_PORT = 9998
const PATH_NAME = 'cafe'
const WHIP_URL = `https://127.0.0.1:${WHIP_PORT}/${PATH_NAME}/whip`
const YOUTUBE_RTMPS_BASE = 'rtmps://a.rtmp.youtube.com:443/live2'
const RELEASES_URL =
  'https://github.com/goldbuick/zed-software-system/releases/latest'

module.exports = {
  WHIP_PORT,
  RTSP_PORT,
  AUTH_PORT,
  PATH_NAME,
  WHIP_URL,
  YOUTUBE_RTMPS_BASE,
  RELEASES_URL,
}
