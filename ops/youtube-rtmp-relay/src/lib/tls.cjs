'use strict'

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

let userdata = ''

function setuserdata(dir) {
  userdata = dir
}

function certdir() {
  if (!userdata) {
    throw new Error('tls: setuserdata() before use')
  }
  const dir = path.join(userdata, 'tls')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function certpaths() {
  const dir = certdir()
  return {
    dir,
    key: path.join(dir, 'server.key'),
    cert: path.join(dir, 'server.crt'),
  }
}

/**
 * Write a self-signed cert for 127.0.0.1 / localhost (requires openssl for SAN).
 */
function ensureservercerts() {
  const paths = certpaths()
  if (fs.existsSync(paths.key) && fs.existsSync(paths.cert)) {
    return paths
  }

  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-days',
      '3650',
      '-nodes',
      '-keyout',
      paths.key,
      '-out',
      paths.cert,
      '-subj',
      '/CN=127.0.0.1',
      '-addext',
      'subjectAltName=IP:127.0.0.1,DNS:localhost',
    ],
    { stdio: 'pipe' },
  )
  return paths
}

function trustcertmacos(certpath) {
  try {
    execFileSync(
      'security',
      [
        'add-trusted-cert',
        '-d',
        '-r',
        'trustRoot',
        '-k',
        `${process.env.HOME}/Library/Keychains/login.keychain-db`,
        certpath,
      ],
      { stdio: 'pipe' },
    )
    return true
  } catch (err) {
    console.warn('macOS trust install failed', err.message)
    return false
  }
}

function trustcertwindows(certpath) {
  try {
    execFileSync('certutil', ['-addstore', '-user', 'Root', certpath], {
      stdio: 'pipe',
    })
    return true
  } catch (err) {
    console.warn('Windows trust install failed', err.message)
    return false
  }
}

function installtrust(certpath) {
  if (process.platform === 'darwin') {
    return trustcertmacos(certpath)
  }
  if (process.platform === 'win32') {
    return trustcertwindows(certpath)
  }
  return false
}

module.exports = {
  setuserdata,
  ensureservercerts,
  installtrust,
  certpaths,
}
