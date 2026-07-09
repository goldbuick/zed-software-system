export function isdevbuild(): boolean {
  return typeof import.meta !== 'undefined' && import.meta.env?.DEV === true
}
