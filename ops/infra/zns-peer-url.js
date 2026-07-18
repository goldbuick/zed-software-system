/**
 * Pure ZNS peer join URL helpers shared by net-zns-worker and Jest.
 */

/**
 * @param {string} joinoriginbase
 * @param {string} peerid
 * @returns {string}
 */
export function buildpeerjoinlocation(joinoriginbase, peerid) {
  const base = String(joinoriginbase ?? '').replace(/\/+$/, '')
  return `${base}/join/#${peerid}`
}

/**
 * @param {string} pathkey
 * @param {{ stored: string, metadata?: { kind?: string } }} row
 * @returns {{ success: true, key: string, value: string, metadata: unknown }}
 */
export function buildapireadpeerbody(pathkey, row) {
  return {
    success: true,
    key: pathkey,
    value: row.stored,
    metadata: row.metadata,
  }
}
