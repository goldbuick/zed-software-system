/** Default per-test and hook ceiling; override in a file with jest.setTimeout(ms) when needed. */
const DEFAULT_TEST_TIMEOUT_MS = 120_000

jest.setTimeout(DEFAULT_TEST_TIMEOUT_MS)

beforeEach(() => {
  jest.setTimeout(DEFAULT_TEST_TIMEOUT_MS)
})
