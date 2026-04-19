/** Strategy B: full-document push over rxrepl instead of json-diff clientpatch. */
export function zssrxrepldocumentmode(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.ZSS_RXREPL_DOCUMENTS === '1' ||
      process.env.VITE_ZSS_RXREPL_DOCUMENTS === '1'
    )
  }
  return false
}
