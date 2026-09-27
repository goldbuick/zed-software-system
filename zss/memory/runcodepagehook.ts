/**
 * expr calls memoryruncodepage without importing runtime.
 * runtime registers the implementation at module init.
 */
type RUNCODEPAGE = (address: string, label: string) => void

let runcodepageimpl: RUNCODEPAGE | undefined

export function memoryruncodepage(address: string, label: string) {
  if (!runcodepageimpl) {
    throw new Error('memoryruncodepage unavailable')
  }
  runcodepageimpl(address, label)
}

export function registermemoryruncodepage(impl: RUNCODEPAGE) {
  runcodepageimpl = impl
}
