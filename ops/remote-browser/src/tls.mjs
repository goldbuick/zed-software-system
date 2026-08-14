'use strict'

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function userdata() {
  return path.join(os.homedir(), '.zedcafe-remote-browser')
}

export function certpaths() {
  const dir = path.join(userdata(), 'tls')
  fs.mkdirSync(dir, { recursive: true })
  return {
    dir,
    key: path.join(dir, 'server.key'),
    cert: path.join(dir, 'server.crt'),
  }
}

export function ensureservercerts() {
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

export function installtrust(certpath) {
  if (process.platform === 'darwin') {
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
      console.warn('macos trust install failed', err.message)
      return false
    }
  }
  if (process.platform === 'win32') {
    try {
      execFileSync('certutil', ['-addstore', '-user', 'Root', certpath], {
        stdio: 'pipe',
      })
      return true
    } catch (err) {
      console.warn('windows trust install failed', err.message)
      return false
    }
  }
  return false
}
