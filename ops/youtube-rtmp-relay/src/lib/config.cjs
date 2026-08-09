'use strict'

const { randomBytes } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const DEFAULTS = {
  youtubeStreamKey: '',
  localBearer: '',
  tlsTrusted: false,
}

let userdata = ''

function setuserdata(dir) {
  userdata = dir
}

function configpath() {
  if (!userdata) {
    throw new Error('config: setuserdata() before use')
  }
  return path.join(userdata, 'config.json')
}

function readraw() {
  try {
    const raw = fs.readFileSync(configpath(), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

function writeraw(data) {
  fs.mkdirSync(path.dirname(configpath()), { recursive: true })
  fs.writeFileSync(configpath(), JSON.stringify(data, null, 2), 'utf8')
}

function ensurebearer() {
  const data = readraw()
  if (typeof data.localBearer === 'string' && data.localBearer.length >= 16) {
    return data.localBearer
  }
  data.localBearer = randomBytes(24).toString('base64url')
  writeraw(data)
  return data.localBearer
}

function getconfig() {
  const data = readraw()
  return {
    youtubeStreamKey: String(data.youtubeStreamKey || ''),
    localBearer: ensurebearer(),
    tlsTrusted: Boolean(data.tlsTrusted),
  }
}

function setyoutubekey(key) {
  const data = readraw()
  data.youtubeStreamKey = String(key || '').trim()
  writeraw(data)
}

function regenerateverbearer() {
  const data = readraw()
  data.localBearer = randomBytes(24).toString('base64url')
  writeraw(data)
  return data.localBearer
}

function settlstrusted(value) {
  const data = readraw()
  data.tlsTrusted = Boolean(value)
  writeraw(data)
}

module.exports = {
  setuserdata,
  getconfig,
  setyoutubekey,
  regenerateverbearer,
  settlstrusted,
  ensurebearer,
}
