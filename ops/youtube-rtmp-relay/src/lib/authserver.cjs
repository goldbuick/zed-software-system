'use strict'

const http = require('node:http')
const { AUTH_PORT } = require('./constants.cjs')

let server
let expectedbearer = ''

function setexpectedbearer(bearer) {
  expectedbearer = String(bearer || '')
}

function startauthserver() {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve(AUTH_PORT)
      return
    }
    server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://127.0.0.1:${AUTH_PORT}`)
        if (url.pathname !== '/auth') {
          res.writeHead(404)
          res.end()
          return
        }
        const token = url.searchParams.get('token') || ''
        const pass = url.searchParams.get('pass') || ''
        const user = url.searchParams.get('user') || ''
        const action = url.searchParams.get('action') || ''
        const ok =
          expectedbearer &&
          (token === expectedbearer ||
            pass === expectedbearer ||
            user === expectedbearer)
        // Allow read of local path for ffmpeg remux without bearer.
        if (action === 'read' || action === 'playback') {
          res.writeHead(200)
          res.end('ok')
          return
        }
        if (ok) {
          res.writeHead(200)
          res.end('ok')
          return
        }
        res.writeHead(401)
        res.end('denied')
      } catch {
        res.writeHead(500)
        res.end('error')
      }
    })
    server.listen(AUTH_PORT, '127.0.0.1', () => resolve(AUTH_PORT))
    server.on('error', reject)
  })
}

function stopauthserver() {
  return new Promise((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => {
      server = undefined
      resolve()
    })
  })
}

module.exports = {
  setexpectedbearer,
  startauthserver,
  stopauthserver,
}
