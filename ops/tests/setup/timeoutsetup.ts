import { TextDecoder, TextEncoder } from 'node:util'

/** Default per-test and hook ceiling; override in a file with jest.setTimeout(ms) when needed. */
const DEFAULT_TEST_TIMEOUT_MS = 120_000

// jsdom (@jest-environment jsdom) does not implement the standard
// TextEncoder/TextDecoder Web APIs that real browsers and Node both have
// globally -- source under zss/ that runs in the browser (iframe) uses the
// global directly, so tests exercising it under jsdom need the same polyfill.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder
}

jest.setTimeout(DEFAULT_TEST_TIMEOUT_MS)

beforeEach(() => {
  jest.setTimeout(DEFAULT_TEST_TIMEOUT_MS)
})
