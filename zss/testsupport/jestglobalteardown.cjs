/**
 * Runs once per Jest worker after all suites in that worker finish.
 * Tears down the shared Yjs modem when a test file pulled it in, so Awareness
 * setInterval handles do not keep the worker alive.
 */
module.exports = async function jestglobalteardown() {
  try {
    const modempath = require.resolve('zss/device/modem')
    if (!require.cache[modempath]) {
      return
    }
    const { destroymodemfortest } = require(modempath)
    destroymodemfortest()
  } catch {
    // modem not loaded in this worker
  }
}
